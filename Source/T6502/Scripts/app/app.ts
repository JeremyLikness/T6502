///<reference path="defs/angular.d.ts"/>
///<reference path="defs/jquery.d.ts"/>
///<reference path="./globalConstants.ts"/>
///<reference path="emulator/cpu.ts"/> 

/* 

6502 emulator in TypeScript and AngularJS
   
(c) 2013 Jeremy Likness

   http://csharperimage.jeremylikness.com/ 

Released under MIT license:

   https://t6502.codeplex.com/license
*/

module Main {
    export class App {
        public static Filters: ng.IModule = angular.module("app.filters", []);
        public static Directives: ng.IModule = angular.module("app.directives", []);        
        public static Services: ng.IModule = angular.module("app.services", []);
        public static Controllers: ng.IModule = angular.module("app.controllers", ["app.services"]);    
        public static Module: ng.IModule = angular.module("app", 
            ["app.filters", "app.directives", "app.services", "app.controllers"]);    
    }
}