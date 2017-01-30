var catalogPage = require('./catalog/catalog.page');
var childrenLimit = 20;

describe('catalog page', function() {

    it('should show more catalog entries on root level after each click on the more button', function() {

        catalogPage.load(92);
        var treeRoot = catalogPage.getTreeRoot();
        var rootList = catalogPage.getChildrenList(treeRoot);

        expect(catalogPage.getEntries(rootList).count()).toBe(childrenLimit);

        for (var i = childrenLimit * 2; i <= childrenLimit * 4; i += childrenLimit) {
            catalogPage.getMoreButton(rootList).click();
            expect(catalogPage.getEntries(rootList).count()).toBe(i);
        }
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

        catalogPage.load(92);
        var rootEntries = catalogPage.getRootEntries();

        expect(catalogPage.getEntityTitle().isPresent()).toBe(false);
        expect(catalogPage.getCatalogText().isPresent()).toBe(false);

        catalogPage.getEntryLabel(rootEntries.get(0)).click();

        expect(catalogPage.getEntityTitle().isPresent()).toBe(true);
        expect(catalogPage.getCatalogText().isPresent()).toBe(true);
    });

    it('should show markers in map view', function() {

        catalogPage.load(92);

        expect(catalogPage.getMarkers().count()).toBe(0);

        catalogPage.getMapButton().click();

        expect(catalogPage.getMarkers().count()).toBeGreaterThan(0);
    });

});
