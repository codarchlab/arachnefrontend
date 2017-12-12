var catalogPage = require('./catalog/catalog.page');
var childrenLimit = 20;

var common = require('./common');

describe('catalog page', function() {

    var testCatalogID = null;

    beforeAll(function(done) {
        var createTestCatalogPromise = common.createTestCatalog();
        createTestCatalogPromise.then(
            function(id) {
                testCatalogID = id;
                done();
            }
        );
    });

    afterAll(common.deleteTestUserInDB);

    fit('will be blood', function() {
        console.log("id:" + testCatalogID);
        catalogPage.load(testCatalogID).then(function() {
            browser.sleep(10000);
        });
    });

    /**
     * stand der Dinge:
     *
     * es können keine öffentlichen kataloge gespeichert werden(!!!) .. entweder backend ändern, katalog gleich nach dem
     * anlegen veröffentlichen, oder
     * einloggen
     *
     * @constructor
     */


    it('should show more catalog entries on root level after each click on the more button', function() {
        catalogPage.load(testCatalogID).then(function() {
            var treeRoot = catalogPage.getTreeRoot();
            var rootList = catalogPage.getChildrenList(treeRoot);

            expect(catalogPage.getEntries(rootList).count()).toBe(childrenLimit);

            for (var i = childrenLimit * 2; i <= childrenLimit * 4; i += childrenLimit) {
                catalogPage.getMoreButton(rootList).click();
                expect(catalogPage.getEntries(rootList).count()).toBe(i);
            }
        }, fail);

    });

    it('should show more catalog entries on a lower level after each click on the more button', function() {

        catalogPage.load(79);
        var rootEntries = catalogPage.getRootEntries();

        catalogPage.getExpandButton(rootEntries.get(0)).click();

        var list = catalogPage.getChildrenList(rootEntries.get(0));
        var entries = catalogPage.getEntries(list);

        expect(entries.count()).toBe(childrenLimit);

        for (var i = childrenLimit * 2; i <= childrenLimit * 4; i += childrenLimit) {
            catalogPage.getMoreButton(list).click();
            expect(catalogPage.getEntries(list).count()).toBe(i);
        }
    });

    it('should show information about the selected catalog entry', function() {

        catalogPage.load(105);
        var rootEntries = catalogPage.getRootEntries();

        expect(catalogPage.getEntityTitle().isPresent()).toBe(false);
        expect(catalogPage.getCatalogText().isPresent()).toBe(false);

        catalogPage.getEntryLabel(rootEntries.get(0)).click();

        expect(catalogPage.getEntityTitle().isPresent()).toBe(true);

        // TODO Check for catalog text as soon as a suitable test catalog exists
        //expect(catalogPage.getCatalogText().isPresent()).toBe(true);
    });

    it('should show markers in map view', function() {

        var width = 1024;
        var height = 768;
        browser.driver.manage().window().setSize(width, height);

        catalogPage.load(105);
        browser.driver.sleep(500);
        browser.waitForAngular();

        expect(catalogPage.getMarkers().count()).toBe(0);

        catalogPage.getMapButton().click();
        browser.driver.sleep(500);
        browser.waitForAngular();

        expect(catalogPage.getMarkers().count()).toBeGreaterThan(0);
    });

});
