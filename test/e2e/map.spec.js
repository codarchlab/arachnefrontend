var EC = protractor.ExpectedConditions;
var map = require('./map/map.page');

describe('map', function() {
    xit('should include a heatmap on the grako_map page', function() {
        browser.get('/project/grako_map?lang=de').then(function () {
            var heatmap = map.getHeatmap();
            expect(heatmap.isPresent()).toBe(true);
        });
    });

    xit('it should show some markers for small result size', function () {
        browser.get('/map?zoom=12&lat=50.42116487566384&lng=4.902398681640625').then(function () {
            var marker = map.getMarkers();
       	    expect(marker.count()).toBeGreaterThanOrEqual(1);
        });
    });

    it('should show as many markers as many previous storage places exist', function() {

    	browser.get('/entity/1076902').then(function() {
			var marker = map.getMarkers();
			expect(marker.count()).toBe(3);
		})
	})
});