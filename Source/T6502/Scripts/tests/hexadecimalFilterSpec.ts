/// <reference path='jasmine.d.ts'/>
/// <reference path='../app/defs/angular.d.ts'/>
/// <reference path='angular-mocks.d.ts'/>
/// <reference path='../app/defs/jquery.d.ts'/>
/// <reference path='../app/app.ts'/>
/// <reference path='../app/filters/hexadecimal.ts'/>

module Tests {

    describe("hexadecimal filter", () => {
  
        var filter; 

        beforeEach(() => {    
            module('app');          
        });

        beforeEach(() => {
            inject(($filter) => {
                filter = $filter('hexadecimal');
            });
        });

        describe("given invalid input when called", () => {
            it("then should return the value back", () => {        
                expect(filter('zoo')).toEqual('zoo');                
            });
        });

        describe("given valid input when called", () => {
          
            it("then should return the hexadecimal for the number", () => {
                expect(filter(127)).toEqual('0x7F');                
            });
        });
    });
}