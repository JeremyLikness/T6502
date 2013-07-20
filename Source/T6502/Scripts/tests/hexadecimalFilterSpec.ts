/// <reference path='jasmine.d.ts'/>
/// <reference path='../app/defs/angular.d.ts'/>
/// <reference path='angular-mocks.d.ts'/>
/// <reference path='../app/defs/jquery.d.ts'/>
/// <reference path='../app/app.ts'/>
/// <reference path='../app/filters/hexadecimal.ts'/>

module Tests {

    describe("hexadecimal filter", () => {
  
        beforeEach(() => {    
            module('app');          
        });

        describe("given invalid input when called", () => {
            it("then should return the value back", () => {        
                return inject(($filter) => {
                var filter: ng.IFilterService = $filter('hexadecimal');
                expect(filter('zoo')).toEqual('zoo');
                });
            });
        });

        describe("given valid input when called", () => {
          
            it("then should return the hexadecimal for the number", () => {
                return inject(($filter) => {
                    var filter: any = $filter('hexadecimal');
                    expect(filter(0x7f)).toEqual('0x7F');
                });
            });
        });
    });
}