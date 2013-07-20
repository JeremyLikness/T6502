/// <reference path='jasmine.d.ts'/>
/// <reference path='../app/defs/angular.d.ts'/>
/// <reference path='angular-mocks.d.ts'/>
/// <reference path='../app/defs/jquery.d.ts'/>
/// <reference path='../app/app.ts'/>
/// <reference path='../app/directives/hexadecimal.ts'/>

module Tests {

    export interface ITestScope extends ng.IScope {
        form: ng.IFormController;
        hexModelValue: string;
    }

    export interface ITestForm extends ng.IFormController {
        hexValue: ng.INgModelController;
    }

    describe("hexadecimal directive", () => {
  
        var $scope: ITestScope; 
        var form: ITestForm;
        
        beforeEach(() => {    
            module('app');          
        });

        beforeEach(() => {
            var html = '<form name="form">';
            html += '<input type="text" id="hexValue" name="hexValue" ng-model="hexModelValue" hexadecimal=""/>';
            html += '</form>';

            inject(($compile: ng.ICompileService, $rootScope: ng.IRootScopeService) => {

                $scope = <ITestScope>$rootScope.$new();

                var elem: JQuery = angular.element(html);
                $compile(elem)($scope);
                form = <ITestForm>$scope.form;
            });
        });

        describe("given invalid input when called", () => {
            it("then should reject the input by setting the hexadecimal validation to false and returning undefined", () => {        
                form.hexValue.$setViewValue("zoo");
                expect($scope.hexModelValue).toBeUndefined();
                expect(form.hexValue.$valid).toBe(false);                
            });
        });

        describe("given valid input when called", () => {
            it("then should accept the input by setting the hexadecimal validation to true", () => {        
                form.hexValue.$setViewValue("fff");
                expect($scope.hexModelValue).toBe("fff");
                expect(form.hexValue.$valid).toBe(true);                
            });
        });

    });
}