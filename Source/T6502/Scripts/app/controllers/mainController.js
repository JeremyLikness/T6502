var Main;
(function (Main) {
    var MainController = (function () {
        function MainController($scope, consoleService, cpuService, $timeout) {
            this.$scope = $scope;
            var _this = this;
            this.cpuService = cpuService;
            $scope.title = "TypeScript 6502 Emulator.";
            $scope.cpu = cpuService.getCpu();
            $scope.pc = "C000";
            $scope.compilerInfo = "";
            $scope.setPc = function () {
                var address = parseInt(_this.$scope.pc, 16);
                if(!angular.isNumber(address) || address === NaN || address < 0 || address) {
                    _this.$scope.pc = "Invalid address.";
                    return;
                }
                _this.$scope.cpu.rPC = address;
            };
            $scope.decompile = function () {
                try  {
                    var address = parseInt(_this.$scope.pc, 16);
                    if(address < 0 || address > Constants.Memory.Max) {
                        _this.$scope.compilerInfo = "Invalid address.";
                        return;
                    }
                    _this.$scope.compilerInfo = _this.cpuService.getCompiler().decompile(address);
                } catch (e) {
                    _this.$scope.compilerInfo = e;
                }
            };
            $scope.compile = function () {
                var source = _this.$scope.compilerInfo;
                _this.cpuService.getCompiler().compile(source);
            };
        }
        MainController.$inject = [
            "$scope", 
            "consoleService", 
            "cpuService", 
            "$timeout"
        ];
        return MainController;
    })();
    Main.MainController = MainController;    
    Main.App.Controllers.controller("MainCtrl", MainController);
})(Main || (Main = {}));
