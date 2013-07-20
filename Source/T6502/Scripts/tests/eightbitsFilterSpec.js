var Tests;
(function (Tests) {
    describe("eightbits filter", function () {
        beforeEach(function () {
            module('app');
        });

        describe("given invalid input when called", function () {
            it("then should return the value back", function () {
                return inject(function ($filter) {
                    var filter = $filter('eightbits');
                    expect(filter('zoo')).toEqual('zoo');
                });
            });
        });

        describe("given valid input when called", function () {
            it("then should return the bits for the number", function () {
                return inject(function ($filter) {
                    var filter = $filter('eightbits');
                    expect(filter(0xff)).toEqual('11111111');
                });
            });

            it("with smaller number then should pad bits to 8 places", function () {
                return inject(function ($filter) {
                    var filter = $filter('eightbits');
                    expect(filter(0x01)).toEqual('00000001');
                });
            });
        });
    });
})(Tests || (Tests = {}));
