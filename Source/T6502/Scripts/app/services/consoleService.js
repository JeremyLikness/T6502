///<reference path="../app.ts"/>
var Services;
(function (Services) {
    var ConsoleService = (function () {
        function ConsoleService() {
            this.lines = [];
        }
        ConsoleService.prototype.log = function (message) {
            this.lines.push(message);
        };
        return ConsoleService;
    })();
    Services.ConsoleService = ConsoleService;

    Main.App.Services.service("consoleService", ConsoleService);
})(Services || (Services = {}));
//@ sourceMappingURL=consoleService.js.map
