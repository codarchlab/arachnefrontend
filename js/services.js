'use strict';

/* Services */
angular.module('arachne.services', [])

	// singleton service for search access
	// caches query results and issues search request if GET parameters change
	.factory('searchService', ['$location', 'Entity', '$rootScope', 'Query', '$q',
		function($location, Entity, $rootScope, Query, $q) {

			var _currentQuery = Query.fromSearch($location.search());
			var _result = { entities: [] };
			var CHUNK_SIZE = 50;
			var chunkPromise = false;

			// check if query changed in a way that requires a new backend call
			$rootScope.$on("$locationChangeSuccess", function(event, newState, oldState) {
				console.log("$locationChangeSuccess");
				if (Object.keys($location.search()).length > 0) {
					var newQuery = Query.fromSearch($location.search());
					if (!angular.equals(newQuery.toFlatObject(),_currentQuery.toFlatObject())) {
						console.log("new query");
						_result = { entities: [] };
					}
					_currentQuery = newQuery;
				}
			});

			function retrieveChunkDeferred(offset) {
				console.log('promise 1',chunkPromise);
				if (chunkPromise) {
					chunkPromise = chunkPromise.then(function(data) {
						return retrieveChunk(offset);
					});
				} else {
					chunkPromise = retrieveChunk(offset);
				}
				console.log('promise 2',chunkPromise);
				return chunkPromise;
			}

			function retrieveChunk(offset) {

				var deferred = $q.defer();

				// chunk is cached
				if (!angular.isUndefined(_result.entities[offset])) {
					var entities = _result.entities.slice(offset, offset + CHUNK_SIZE);
					console.log("retrieveChunk cached entities", entities);
					chunkPromise = false;
					deferred.resolve(entities);
					return deferred.promise;
				// chunk needs to be retrieved
				} else {
					console.log("retrieveChunk current query", _currentQuery.toFlatObject());
					var query = angular.extend({offset:offset,limit:CHUNK_SIZE},_currentQuery.toFlatObject());
					console.log("retrieveChunk issuing query", query);
					var entities = Entity.query(query);
					return entities.$promise.then(function(data) {
						_result.size = data.size;
						_result.facets = data.facets;
						for (var i = 0; i < data.entities.length; i++) {
							_result.entities[parseInt(offset)+i] = data.entities[i];
						};
						console.log("new result", _result);
						chunkPromise = false;
						deferred.resolve(data.entities);
						return deferred.promise;
					});
				}

			}

			return {

				getEntity: function(resultIndex) {

					console.log("getEntity" , resultIndex);

					var deferred = $q.defer();

					if (resultIndex < 0) {
						deferred.reject();
						return deferred.promise;
					}
					
					var offset = Math.floor(resultIndex / CHUNK_SIZE) * CHUNK_SIZE;
					console.log("getEntity offset" , offset);
					
					return retrieveChunkDeferred(offset).then(function(data) {
						deferred.resolve(data[resultIndex - offset]);
						return deferred.promise;
					});

				},

				getFacets: function() {
					return _result.facets;
				},

				getSize: function() {
					return _result.size;
				},

				getCurrentPage: function() {

					var offset = _currentQuery.offset;
					if (angular.isUndefined(offset)) offset = 0;

					console.log("getCurrentPage", offset);

					return retrieveChunkDeferred(offset);

				},

				currentQuery: function() {
					return _currentQuery;
				}

			}

		}
	])

	// represents a search query
	// handles conversion between string representation for frontend URLs
	// and flat object representation for backend requests
	.factory('Query', function() {

		function Query() {
			this.facets = {};
			this.offset = 0;
			this.limit = 50;
		}

		Query.prototype = {

			// constructs a new query object from this query
			// and adds or replaces a parameter, returns the new query
			setParam: function(key,value) {
				var newQuery = angular.copy(this);
				newQuery[key] = value;
				return newQuery;
			},

			// constructs a new query object from this query
			// and removes a parameter, returns the new query
			removeParam: function(key) {
				var newQuery = angular.copy(this);
				delete newQuery[key];
				return newQuery;
			},

			// constructs a new query object from this query
			// and adds an additional facet, returns the new query
			addFacet: function(facetName,facetValue) {
				var newQuery = angular.copy(this);
				newQuery.facets[facetName] = facetValue;
				return newQuery;
			},

			// constructs a new query object from this query
			// and removes a facet, returns the new query
			removeFacet: function(facetName) {
				var newQuery = angular.copy(this);
				delete newQuery.facets[facetName];
				return newQuery;
			},

			hasFacet: function(facetName) {
				return (facetName in this.facets);
			},

			hasFacets: function() {
				return Object.keys(this.facets).length > 0;
			},

			// returns a representation of this query as GET parameters
			toString: function() {
				
				var params = [];
				for(var key in this) {
					if (key == 'facets') {
						for(var facetName in this.facets) {
							var facetString = facetName + ":\"" + this.facets[facetName] + "\"";
							params.push("fq=" + encodeURIComponent(facetString));
						}
					} else if (angular.isString(this[key]) || angular.isNumber(this[key])) {
						if(!(key == 'limit') && (this[key] || key == 'resultIndex')) {
							params.push(key + "=" + encodeURIComponent(this[key]));
						}
					}
				}

				if (params.length > 0) {
					return "?" + params.join("&");
				} else {
					return "";
				}
				
			},

			// return a representation of this query as a flat object
			// that can be passed as a params object to $resource and $http
			toFlatObject: function() {
				var object = {};
				for(var key in this) {
					if (key == 'facets') {
						object.fq = [];
						for(var facetName in this.facets) {
							var facetString = facetName + ":\"" + this.facets[facetName] + "\"";
							object.fq.push(facetString);
						}
					} else if (['q'].indexOf(key) != -1) {
						object[key] = this[key];
					}
				}
				return object;
			}

		};

		// factory for building query from angular search object
		Query.fromSearch = function(search) {
			var newQuery = new Query();
			for(var key in search) {
				if (key == 'fq') {
					if (angular.isString(search['fq'])) {
						var facet = search['fq'].split(':');
						newQuery.facets[facet[0]] = facet[1].substr(1,facet[1].length-2);
					} else if (angular.isArray(search['fq'])) {
						search['fq'].forEach(function(facetString) {
							var facet = facetString.split(':');
							newQuery.facets[facet[0]] = facet[1].substr(1,facet[1].length-2);
						})
					}
				} else {
					newQuery[key] = search[key];
				}
			}
			return newQuery;
		}

		return Query;

	})

	// resource interface for backend requests to entity- and search-endpoints
	.factory('Entity', ['$resource', 'arachneSettings',
		function($resource, arachneSettings) {

			return $resource(
				arachneSettings.dataserviceUri + "/:endpoint/:id",
				{ id: '@entityId' },
				{
					get: { 
						method: 'GET', 
						params: { endpoint: 'entity'} 
					},
					query: { 
						method: 'GET', 
						params: { endpoint: 'search' } 
					},
					context: { 
						method: 'GET',
						params: { endpoint: 'contexts'} 
					},
					imageProperties: {
						method: 'GET',
						url: arachneSettings.dataserviceUri + '/image/zoomify/:id/ImageProperties.xml'
					}
				}
			);

		}
	])

	// deprecated
	.factory('arachneSearch', 
		['$resource','$location', 'arachneSettings', 
			function($resource, $location, arachneSettings) {

			//PRIVATE
				function parseUrlFQ (fqParam) {
					if(!fqParam) return [];
					var facets = [];
					fqParam = fqParam.split(/\"\,/);
					for (var i = fqParam.length - 1; i >= 0; i--) {
						var facetNameAndVal = fqParam[i].replace(/"/g,'').split(':');
						
							facets.push({
								name: facetNameAndVal[0],
								value: facetNameAndVal[1]
							});
						
					};
					return facets;
				};

			  // Define all server connections in this angular-resource
				var arachneDataService = $resource('', { }, {
					query: {
						url : arachneSettings.dataserviceUri + '/search',
						isArray: false,
						method: 'GET',
						transformResponse : function (data, headers) {
							try {
								var data = JSON.parse(data);
								data.page = ((data.offset? data.offset : 0) / (data.limit? data.limit : 50))+1;
								angular.forEach(data.facets, function(facet, index) {
									if (arachneSettings.openFacets.indexOf(facet.name) != -1) {
										facet.open = true;
									} else {
										facet.open = false;
									}
								});

								return data;
							} catch (e) {
								return false;
							}
						}
					},

					queryWithMarkers : {
						url : arachneSettings.dataserviceUri + '/search',
						isArray: false,
						method: 'GET',
						transformResponse : function (data) {
							var data = JSON.parse(data);
							data.page = ((data.offset? data.offset : 0) / (data.limit? data.limit : 50))+1;
							return data;
						}

					}
				});
				
				//USE GETTERS FOR THE FOLLOWING ATTRIBUTES!
				var _activeFacets  = [];
				var _currentQueryParameters  = {};
				var _resultIndex = null;

				
			 //PUBLIC
				return {
					
				  //SEARCHING METHODS
				  	// persitentSearch means that all queryParams get saved by this factory
					persistentSearch : function (queryParams, successMethod, errorMethod) {
						if (queryParams) {
							this.setCurrentQueryParameters(queryParams);
						} else {
							this.setActiveFacets($location.search().fq);
							this.setCurrentQueryParameters($location.search());
						}
						return arachneDataService.query(_currentQueryParameters, successMethod, errorMethod);
					},

					search : function (queryParams, successMethod) {
						return arachneDataService.query(queryParams, successMethod);
					},
					
					
				  
				  //SETTERS FOR VARIABLES
					setResultIndex : function (resultIndex) {
						_resultIndex = parseInt(resultIndex);
					},
					setCurrentQueryParameters : function (queryParams) {
						if(_currentQueryParameters != queryParams) {
							if(queryParams.offset) queryParams.offset = parseInt(queryParams.offset);
							if(queryParams.limit) queryParams.limit = parseInt(queryParams.limit);
							if(queryParams.view) queryParams.view = queryParams.view;
							if(queryParams.offset==0) delete queryParams.offset;
							if(queryParams.limit==0) delete queryParams.limit;
							angular.copy(queryParams,_currentQueryParameters);
						}
					},
					setActiveFacets : function () {
						angular.copy(parseUrlFQ($location.search().fq), _activeFacets );
						//console.log(_activeFacets);
					},
					
				  //GETTERS FOR VARIABLES
					getActiveFacets : function () {
						return _activeFacets;
					},
					getCurrentQueryParameters : function () {
						return _currentQueryParameters;
					},
					getResultIndex : function () {
						return _resultIndex;
					},
					

					goToPage : function (page, view) {
						var hash = $location.search();
						if (!hash.limit) hash.limit = 50; //_defaultLimit;
						hash.offset = hash.limit*(page-1);
						hash.view = view;
						$location.search(hash);
					},
					addFacet : function (facetName, facetValue) {
						//Check if facet is already included
						for (var i = _activeFacets.length - 1; i >= 0; i--) {
							if (_activeFacets[i].name == facetName) return;
						};

						var hash = $location.search();

						if (hash.fq) {
							hash.fq += "," + facetName + ':"' + facetValue + '"';
						} else {
							hash.fq = facetName + ':"' + facetValue + '"';
						}

						delete(hash.offset);
						delete(hash.limit);
						
						$location.search(hash);
					},

					removeFacet : function (facet) {
						for (var i = _activeFacets.length - 1; i >= 0; i--) {
							if (_activeFacets[i].name == facet.name) {
								_activeFacets.splice(i,1);
							}
						};
						
						var facets = _activeFacets.map(function(facet){
							return facet.name + ':"' + facet.value + '"';
						}).join(",");

						var hash = $location.search();
						hash.fq = facets;

						delete(hash.offset);
						delete(hash.limit);

						$location.search(hash);
					},

					persistentSearchWithMarkers : function(queryParams){
						if (queryParams) {
							this.setCurrentQueryParameters(queryParams);
						} else {							
							this.setActiveFacets($location.search().fq);
							this.setCurrentQueryParameters($location.search());
						}
						return arachneDataService.queryWithMarkers(_currentQueryParameters);
					}
				}			
		}])

	.factory('arachneEntity',
		['$resource', 'arachneSettings',
			function($resource, arachneSettings) {

			  // PERSISTENT OBJECTS, PRIVATE, USE GETTERS AND SETTERS
				var _currentEntity = {};
				var _activeContextFacets  = [];

			  //SERVERCONNECTION (PRIVATE)
				var arachneDataService = $resource('', { }, {
					get : {
						url: arachneSettings.dataserviceUri + '/entity/:id',
						isArray : false,
						method: 'GET'
					},
					context :  {
						//in transformReponse an Array gets build, so an array should be the aspected result
						isArray: true,
						url : arachneSettings.dataserviceUri + '/contexts/:id',
						method: 'GET',
						transformResponse : function (data) {
							var facets = JSON.parse(data).facets;
							var categoryFacet = {};
							for (var i = facets.length - 1; i >= 0; i--) {
								if(facets[i].name == "facet_kategorie") {
									categoryFacet = facets[i];
									break;
								}
							};
							
							return categoryFacet.values;
						}
					},
					contextEntities : {
						isArray: true,
						url : arachneSettings.dataserviceUri + '/contexts/:id',
						method: 'GET',
						transformResponse : function (data) {
							return JSON.parse(data).entities;
						}
					},
					contextQuery : {
						isArray: false,
						url : arachneSettings.dataserviceUri + '/contexts/:id',
						method: 'GET'
					},
					getSpecialNavigations : {
						url: arachneSettings.dataserviceUri + '/specialNavigationsService?type=entity&id=:id',
						isArray : false,
						method: 'GET'
					},
					getImageProperties : {
						url: arachneSettings.dataserviceUri + '/image/zoomify/:id/ImageProperties.xml',
						isArray : false,
						method: 'GET',
						transformResponse : function (data) {
							if(data) {
								var properties = {};
								if (window.DOMParser) {
									var parser = new DOMParser();
									properties = parser.parseFromString(data,"text/xml");
								} else {
									properties = new ActiveXObject("Microsoft.XMLDOM");
									properties.async=false;
									properties.loadXML(data);
								}
								return {
									width : properties.firstChild.getAttribute('WIDTH'),
									height : properties.firstChild.getAttribute('HEIGHT'),
									tilesize : properties.firstChild.getAttribute('TILESIZE')
								};
							}
						}
					}
				});

				function serializeParamsAndReturnContextSearch () {
					var queryParams = { id : _currentEntity.entityId };
					queryParams.fq = _activeContextFacets.map(function(facet){return facet.name + ":" + facet.value}).join(',')

					return arachneDataService.contextQuery(queryParams);
				};

				var catchError = function(response) {
					_currentEntity.error = response.status;
				};


			  // PUBLIC
				return {
					resetActiveContextFacets : function() {
						_activeContextFacets = [];
					},
					getActiveContextFacets : function () {
						return _activeContextFacets;
					},
					getEntityById : function(entityId, successMethod) {
						successMethod = successMethod || function () {};
						
						if (_currentEntity.entityId == entityId) {
							//Caching!
							successMethod(_currentEntity);
							return _currentEntity;
						} else {
							_currentEntity = arachneDataService.get({id:entityId},successMethod, catchError);
							return _currentEntity;
						}
					},
					getImageProperties : function(queryParams, successMethod, errorMethod){
						return arachneDataService.getImageProperties(queryParams, successMethod, errorMethod);
					},
					getSpecialNavigations : function(entityId) {
						return arachneDataService.getSpecialNavigations({id:entityId});
					},
					getContext : function (queryParams) {
						return arachneDataService.context(queryParams);
					},
					getContextualEntitiesByAddingCategoryFacetValue : function (facetValue) {
						// important to note: this method doesnt use _activeFacets!
						return arachneDataService.contextEntities({id: _currentEntity.entityId, fq: 'facet_kategorie:' + facetValue});
					},
					getContextualQueryByAddingFacet : function (facetName, facetValue) {

						// Check if facet is already added
						for (var i = _activeContextFacets.length - 1; i >= 0; i--) {
							if (_activeContextFacets[i].name == facetName) return;
						};
						// Add facet
						_activeContextFacets.push({name: facetName, value: facetValue});
						
						return serializeParamsAndReturnContextSearch();
					},
					getContextualQueryByRemovingFacet : function (facet) {
						//remove Facet
						for (var i = _activeContextFacets.length - 1; i >= 0; i--) {
							if (_activeContextFacets[i].name == facet.name) {
								_activeContextFacets.splice(i,1);
							}
						};
						
						
						return serializeParamsAndReturnContextSearch()

					},
					resetContextFacets : function () {
						_activeContextFacets = [];
					}
				}
			}
		]
	)

	// singleton service for authentication, stores credentials in browser cookie
	// if cookie is present the stored credentials get sent with every backend request
	.factory('authService', ['$http', 'arachneSettings', '$filter', '$cookieStore', 
		function($http, arachneSettings, $filter, $cookieStore) {

			// initialize to whatever is in the cookie, if anything
			if ($cookieStore.get('ar-authdata')) {
		    	$http.defaults.headers.common['Authorization'] = 'Basic ' + $cookieStore.get('ar-authdata');
		    } else {
		    	delete $http.defaults.headers.common['Authorization'];
		    }
		 
		    return {

		        setCredentials: function (username, password, successMethod, errorMethod) {
		            var encoded = $filter('base64')(username + ':' + $filter('md5')(password));
		            $http.get(arachneSettings.dataserviceUri + '/', { headers: { 'Authorization': 'Basic ' + encoded } })
		            .success(function(response) {
		            	$http.defaults.headers.common.Authorization = 'Basic ' + encoded;
		            	$cookieStore.put('ar-authdata', encoded);
		            	$cookieStore.put('ar-user', { username: username });
		            	successMethod();
		            }).error(function(response) {
		            	errorMethod(response);
		            });
		        },

		        clearCredentials: function () {
		            document.execCommand("ClearAuthenticationCache");
		            $cookieStore.remove('ar-authdata');
		            $cookieStore.remove('ar-user');
		            delete $http.defaults.headers.common['Authorization'];
		        },

		        getUser: function() {
		        	return $cookieStore.get('ar-user');
		        }

		    };

		}
	])

	.factory('newsFactory', ['$http', 'arachneSettings', function($http, arachneSettings){
		var factory = {};
		factory.getNews = function() {
				return $http.get( arachneSettings.dataserviceUri + '/news/de');
			};
		return factory;
	}])

	.factory('singularService', ['$http', function($http ){
		var singular = {
			"Bauwerke": "Bauwerk", 
			"Bauwerksteile": "Bauwerksteil",
			"Einzelobjekte": "Einzelobjekt",
			"Objekte": "Objekt",
			"Bilder": "Bild",
			"Typen": "Typus",
			"Sammlungen": "Sammlung",
			"Topographien": "Topographie",
			"Rezeptionen": "Rezeption",
		 	"Reproduktionen": "Reproduktion",
		 	"Einzelmotive": "Einzelmotiv",
		 	"Mehrteilige Denkmäler": "Mehrteiliges Denkmal",
		 	"Inschriften": "Inschrift",
			"Bücher": "Buch",
			"Buchseiten": "Buchseite",
			"Szenen": "Szene",
			"Literatur": "Literatur",
			"Orte": "Ort",
			"Personen": "Person",
			"Sammler":  "Sammler",
			"Gruppierung": "Gruppierung",
			"type_sammler": "Sammler",
			"type_gruppierung": "Gruppierung"
		};
		var factory ={};
		factory.getSingular = function() {
			return singular;
		}
		return factory;
	}])

	.factory('NoteService', ['$resource', 'arachneSettings', '$http', '$modal', 'authService',
		function($resource, arachneSettings, $http, $modal, authService){

			var catchError = function(errorReponse) {
				if (errorReponse.status == 403) {
					// really?
					authService.clearCredentials();
				};
			};

			var arachneDataService = $resource('', { }, {
				getBookmarkInfo : {
					url : arachneSettings.dataserviceUri + '/search',
					isArray: false,
					method: 'GET'
				},
				createBookmarksList: {
					url :  arachneSettings.dataserviceUri + '/bookmarklist',
					isArray: false,
					method: 'POST',
					headers: {'Content-Type': 'application/json'}
				},
				updateBookmarksList: {
					url :  arachneSettings.dataserviceUri + '/bookmarklist/:id',
					isArray: false,
					method: 'POST',
					headers: {'Content-Type': 'application/json'}
				},
				getBookmarksList : {
					url: arachneSettings.dataserviceUri + '/bookmarklist/:id',
					isArray: false,
					method: 'GET'
				},
				getBookmarksLists : {
					url : arachneSettings.dataserviceUri + '/bookmarklist',
					isArray: true,
					method: 'GET'
				},
				deleteBookmarksList: {
					url : arachneSettings.dataserviceUri + '/bookmarklist/:id',
					isArray: false,
					method: 'DELETE'
				},
				deleteBookmark: {
					url : arachneSettings.dataserviceUri + '/bookmark/:id',
					isArray: false,
					method: 'DELETE'
				},
				getBookmark: {
					url: arachneSettings.dataserviceUri + '/bookmark/:id',
					isArray: false,
					method: 'GET'
				},
				updateBookmark: {
					url: arachneSettings.dataserviceUri + '/bookmark/:id',
					isArray: false,
					method: 'POST',
					headers: {'Content-Type': 'application/json'}
				},
				createBookmark: {
					url :  arachneSettings.dataserviceUri + '/bookmarkList/:id/add',
					isArray: false,
					method: 'POST',
					headers: {'Content-Type': 'application/json'}
				}
			});

			return {
				getBookmarkInfo : function(bookmarksLists, successMethod){
					successMethod = successMethod || function () {};
					var hash = new Object();
					var entityIDs = new Array();
					
					for(var x in bookmarksLists){
						for(var y in bookmarksLists[x].bookmarks){
							entityIDs.push(bookmarksLists[x].bookmarks[y].arachneEntityId);					
						}
					}
					//only do this if there are any bookmarks
					if (entityIDs.length) {
						hash.q = "entityId:(" + entityIDs.join(" OR ") + ")";
						return arachneDataService.getBookmarkInfo(hash, successMethod, catchError);
					};
				},
				queryBookmarListsForEntityId : function(entityID){
					//suche Bookmarks für die Entity ID in dem alle anderen rausgeschmissen werden
					return arachneDataService.getBookmarksLists({}, function(lists){
						for(var listIndex = lists.length-1; listIndex >= 0 ; listIndex--) {
							for(var bookmarkIndex = lists[listIndex].bookmarks.length-1; bookmarkIndex >= 0 ; bookmarkIndex--) {
								if(lists[listIndex].bookmarks[bookmarkIndex].arachneEntityId != entityID) {
								 	lists[listIndex].bookmarks.splice(bookmarkIndex,1);
								 }
							}
						}
					}, catchError);

					
				},
				getBookmarksList : function(id, successMethod, errorMethod){
					return arachneDataService.getBookmarksList({ "id": id}, successMethod,errorMethod);
				},
				getBookmarksLists : function(successMethod){
					successMethod = successMethod || function () {};
					return arachneDataService.getBookmarksLists({},successMethod, catchError);
				},
				createBookmarksList : function(successMethod, errorMethod) {
					var modalInstance = $modal.open({
						templateUrl: 'partials/Modals/createBookmarksList.html'
					});	

					modalInstance.close = function(name, commentary){
						commentary = typeof commentary !== 'undefined' ? commentary : "";
						if(name == undefined || name == "") {
							alert("Bitte Titel eintragen.")							
						} else {
							modalInstance.dismiss();
							var list = {
								'name' : name,
								'commentary' : commentary,
								'bookmarks' : []
							}
							return arachneDataService.createBookmarksList(list, successMethod, errorMethod);
						}
					}
				},
				deleteBookmarksList : function(id, successMethod, errorMethod){
					var id = id;			
					var modalInstance = $modal.open({
						templateUrl: 'partials/Modals/deleteBookmarksList.html'
					});	
					modalInstance.close = function(){
						modalInstance.dismiss();
						return arachneDataService.deleteBookmarksList({ "id": id}, successMethod,errorMethod);
					}
				},
				updateBookmarksList : function (bookmarksList, successMethod, errorMethod) {
					var modalInstance = $modal.open({
						templateUrl: 'partials/Modals/editBookmarksList.html',
						controller : function ($scope) { $scope.bookmarksList = bookmarksList },
						resolve: {
					        'bookmarksList': function () {
					            return bookmarksList;
					        }
						}
					});

					modalInstance.close = function(name,commentary){
						if(bookmarksList.name == undefined || bookmarksList.name == ""){
							alert("Bitte Titel eintragen.");						
						} else {
							modalInstance.dismiss();
							return arachneDataService.updateBookmarksList({"id":bookmarksList.id}, bookmarksList, successMethod, errorMethod);
						}
					}
				},
				deleteBookmark : function(id, successMethod){
					successMethod = successMethod || function () {};
					return arachneDataService.deleteBookmark({ "id": id}, successMethod, catchError);
				},
				getBookmark : function(id, successMethod, errorMethod){
					return arachneDataService.getBookmark({ "id": id}, successMethod,errorMethod);
				},
				updateBookmark: function(bookmark, successMethod, errorMethod) {	
					var modalInstance = $modal.open({
						templateUrl: 'partials/Modals/updateBookmarkModal.html',
						controller: function ($scope) { $scope.bookmark = bookmark },
						resolve: {
					        'bookmark': function () {
					            return bookmark;
					        }
						}
					});

					modalInstance.close = function(commentary){
						if(commentary == undefined || commentary == ""){
							alert("Kommentar setzen!")
						} else {
							modalInstance.dismiss();
							// Achtung, im bookmark-Objekt sind noch Attribute, wie title oder thumbnailId hinzugefügt worden.
							// Hier duerfen aber nur die drei attribute id, arachneEntityId, commenatry übergeben werden, sonst nimmt es das Backend nicht an
							return arachneDataService.updateBookmark(
								{"id":bookmark.id},
								{"id":bookmark.id, "arachneEntityId":bookmark.arachneEntityId, "commentary": commentary},
								successMethod,
								errorMethod
							);
						}
					}
				},
				createBookmark : function(rid, successMethod, errorMethod) {
					arachneDataService.getBookmarksLists(
						function(data){
							if(data.length == 0){
								var modalInstance = $modal.open({
									templateUrl: 'partials/Modals/createBookmarksList.html'
								});	

								modalInstance.close = function(name, commentary){
									commentary = typeof commentary !== 'undefined' ? commentary : "";
									if(name == undefined || name == "") {
										alert("Bitte Titel eintragen.")							
									} else {
										modalInstance.dismiss();
										var list = new Object();
										list.name = name;
										list.commentary = commentary;
										list.bookmarks = [];
										arachneDataService.createBookmarksList(list,
											function(data){
												var modalInstance = $modal.open({
													templateUrl: 'partials/Modals/createBookmark.html',
													controller: 'createBookmarkCtrl'
								      			});

								      			modalInstance.result.then(function (selectedList) { 
								      				if(selectedList.commentary == undefined || selectedList.commentary == "")
								      					selectedList.commentary = "no comment set";

								      				var bm = {
														arachneEntityId : rid,
														commentary : selectedList.commentary
													}
													return arachneDataService.createBookmark({"id": selectedList.item.id}, bm, successMethod,errorMethod);
								      			});
											});
									}
								}
							}
							
							if(data.length >= 1){
								var modalInstance = $modal.open({
									templateUrl: 'partials/Modals/createBookmark.html',
									controller: 'createBookmarkCtrl'
				      			});

				      			modalInstance.result.then(function (selectedList) { 
				      				if(selectedList.commentary == undefined || selectedList.commentary == "")
				      					selectedList.commentary = "no comment set";

				      				var bm = {
										arachneEntityId : rid,
										commentary : selectedList.commentary
									}
									return arachneDataService.createBookmark({"id": selectedList.item.id}, bm, successMethod,errorMethod);
				      			});
				      		}
						}
					);				
				}
			}
		}
	]);
