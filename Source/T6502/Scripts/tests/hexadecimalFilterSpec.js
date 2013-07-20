var Tests;
(function (Tests) {
    describe("hexadecimal filter", function () {
        beforeEach(function () {
            module('app');
        });

        describe("given invalid input when called", function () {
            it("then should return the value back", function () {
                return inject(function ($filter) {
                    var filter = $filter('hexadecimal');
                    expect(filter('zoo')).toEqual('zoo');
                });
            });
        });

        describe("given valid input when called", function () {
            it("then should return the hexadecimal for the number", function () {
                return inject(function ($filter) {
                    var filter = $filter('hexadecimal');
                    expect(filter(0x7f)).toEqual('0x7F');
                });
            });
        });
    });
})(Tests || (Tests = {}));
