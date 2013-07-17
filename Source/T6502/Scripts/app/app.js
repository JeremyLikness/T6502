var Main;
(function (Main) {
    var App = (function () {
        function App() {
        }
        App.Filters = angular.module("app.filters", []);
        App.Directives = angular.module("app.directives", []);
        App.Services = angular.module("app.services", []);
        App.Controllers = angular.module("app.controllers", ["app.services"]);
        App.Module = angular.module("app", ["app.filters", "app.directives", "app.services", "app.controllers"]);
        return App;
    })();
    Main.App = App;
})(Main || (Main = {}));
