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
        decompile: () => void;   
        compile: () => void;    
        setPc: () => void; 
    }

    export class MainController {
        
        public static $inject = ["$scope", "consoleService", "cpuService", "$timeout"];
        private cpuService: Services.CpuService;

        constructor (
            public $scope: IMainControllerScope,
            consoleService: Services.ConsoleService,
            cpuService: Services.CpuService,
            $timeout: ng.ITimeoutService) {    
            
            this.cpuService = cpuService;        
            $scope.title = "TypeScript 6502 Emulator.";
            $scope.cpu = cpuService.getCpu();
            $scope.pc = "C000";
            $scope.compilerInfo = "";

            $scope.setPc = () => {
                var address: number = parseInt(this.$scope.pc, 16);
                if (address < 0 || address > Constants.Memory.Max) {
                    this.$scope.pc = "Invalid address.";
                    return;
                }
                this.$scope.cpu.rPC = address;
            }

            $scope.decompile = () => {
                try {
                    var address = parseInt(this.$scope.pc, 16);
                    if (address < 0 || address > Constants.Memory.Max) {
                        this.$scope.compilerInfo = "Invalid address.";
                        return;
                    }
                    this.$scope.compilerInfo = this.cpuService.getCompiler().decompile(address); 
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