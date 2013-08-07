///<reference path="../app.ts"/>
///<reference path="../emulator/cpu.ts"/>
///<reference path="../services/consoleService.ts"/>
///<reference path="../services/cpuService.ts"/>

module Main {

    export interface IMainControllerScope extends ng.IScope {
        title: string;
        cpu: Emulator.ICpu;
        pc: string;
        compilerInfo: string;
        source: string[];
        selectedSource: string; 
        decompile: () => void; 
        dump: () => void;  
        compile: () => void;    
        setPc: () => void; 
        loadSource: () => void;
    }

    export class MainController {
        
        public static $inject = ["$scope", "consoleService", "cpuService", "$timeout", "$http"];
        private cpuService: Services.CpuService;

        constructor (
            public $scope: IMainControllerScope,
            consoleService: Services.ConsoleService,
            cpuService: Services.CpuService,
            $timeout: ng.ITimeoutService,
            $http: ng.IHttpService) {    
            
            this.cpuService = cpuService;        
            $scope.title = "TypeScript 6502 Emulator.";
            $scope.cpu = cpuService.getCpu();
            $scope.pc = Constants.Memory.DefaultStart.toString(16).toUpperCase();
            $scope.compilerInfo = "";

            $scope.source = ["palette scroll", "sierpinski", "testcomparisons", "testdecimal", "testoverflow"];
            $scope.selectedSource = $scope.source[0];

            $scope.loadSource = () => {
                var url: string = "Source/" + $scope.selectedSource.replace(" ", "_") + ".txt"; 
                $http.get(url).then((result: ng.IHttpPromiseCallbackArg<string>) => {
                    this.$scope.compilerInfo = result.data;
                });
            };

            $scope.setPc = () => {
                this.$scope.cpu.rPC = parseInt(this.$scope.pc, 16);
            }

            $scope.decompile = () => {
                try {
                    this.$scope.compilerInfo = this.cpuService.getCompiler().decompile(
                        parseInt(this.$scope.pc, 16)); 
                }
                catch (e) {
                    this.$scope.compilerInfo = e;
                }
            }

            $scope.dump = () => {
                try {
                    this.$scope.compilerInfo = this.cpuService.getCompiler().dump(
                        parseInt(this.$scope.pc, 16)); 
                }
                catch (e) {
                    this.$scope.compilerInfo = e;
                }
            }

            $scope.compile = () => {
                var source = this.$scope.compilerInfo;
                this.cpuService.getCompiler().compile(source);
            }
        }
    }

    Main.App.Controllers.controller("MainCtrl", MainController);
}