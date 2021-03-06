var querystring = require('querystring');
var common = require('../common');

function parseResultSize(resultSize) {
	return parseInt(resultSize.replace(/[,.]/g, ""));
}

var SearchPage = function() {

	this.load = function(params) {
		var url = '/search';
		if (params) url += "?" + querystring.stringify(params);
		return browser.get(url);
	};

	this.loadScoped = function(scope, searchPage, params) {
		scope = (scope !== null) ? '/project/' + scope + '/': '/';
		searchPage = searchPage || 'search';
		var url = scope + searchPage;
		if (params) url += "?" + querystring.stringify(params);
		return browser.get(url);
	};

	this.getFacetPanel = function(facetName) {
		return element(by.css('.' + facetName + ' .panel-title'));
	};

	this.getFacetValues = function(facetName) {
		return element.all(by.css('.' + facetName + ' .facet-value'));
	};

	this.getMoreButton = function(facetName) {
		return element(by.css('.' + facetName + ' .more'));
	};

	this.getFacetButtons = function(facetName) {
		var facet = element(by.css('.facet.' + facetName + ' ul'));
		return facet.all(by.css('li a'));
	};

	this.getResultSize = function() {
		return new Promise(function(resolve, reject) {
			var resultElem = element(by.binding('resultSize'));
			resultElem.getText().then(function(resultSize) {
				resolve(parseResultSize(resultSize));
			}, function(err) {
				reject(err);
			});
		});
	};

	this.getEntityLinks = function() {
		return element.all(by.css('.ar-imagegrid-cell')).all(by.xpath('./a'));
	};

	this.getImages = function() {
		return element.all(by.css('.ar-imagegrid-cell')).all(by.xpath('./a/div/img'));
	};

	this.getNavBarSearch = function() {
		return element(by.css('.idai-navbar-search > form > input[name="q"]'))
	};

	this.getNavBarSubmit = function() {
		return element(by.css('.idai-navbar-search > form > .input-group-btn > button'))
	};

	this.searchViaNavBar = function(what) {
        return function() {
            return common.typeInPromised(this.getNavBarSearch(), what)
                .then(this.getNavBarSubmit().click)
                .then(browser.getCurrentUrl)
        }.bind(this)

	};

	this.getScopeImage = function() {
		return element(by.css('.search-scope > a > div > img'));
	}



};

module.exports = new SearchPage();
