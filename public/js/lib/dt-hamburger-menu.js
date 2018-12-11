angular
  .module('dt-hamburger-menu', [])
  .directive('dtHamburgerMenu', dtHmburgerMenu);

function dtHmburgerMenu() {
  return {
    restrict: 'E',
    templateUrl: 'dt-hamburger-menu.html',
    controller: dtHmburgerMenuCtrl,
    controllerAs: 'dtHamburgerMenu',
    transclude: true
  };
}

function dtHmburgerMenuCtrl() {
  var vm = this;

  vm.isShowingMenu = false;
  vm.openMenu = openMenu;
  vm.closeMenu = closeMenu;

  function openMenu() {

    vm.isShowingMenu = true;
  }

  function closeMenu() {
    vm.isShowingMenu = false;
  }
}

angular
  .module('dt-hamburger-menu')
  .run(['$templateCache', function($templateCache) {
    $templateCache.put("dt-hamburger-menu.html", [
      '<span class="pull-left hamburger-page-title hidden-xs"><a style="color: #FFF;" ng-href="/#/">{{ ctrl.config.name }}</a></span>',
      '<span class="btn btn-default btn-circle" ng-click="dtHamburgerMenu.openMenu()"><a class="hamburger-menu-button"></a></span>',
      '<div class="hamburger-menu-content" ng-class="{active: dtHamburgerMenu.isShowingMenu}">',
        '<div class="hamburger-menu-close-wrapper">',
          '<a class="hamburger-menu-close" ng-click="dtHamburgerMenu.closeMenu()"></a>',
        '</div>',
        '<div class="logo-holder hidden-xs"></div>',
        '<p class="text-center hidden-xs"><a ng-href="https://alloyproject.org" target="_blank" class="logo-link">alloyproject.org</a></p>',
        '<hr class="hidden-xs">',
        '<ul class="menu-list">',
          '<li class="menu-item"><a ng-click="dtHamburgerMenu.closeMenu()" ng-href="/#/">Block Explorer</a></li>',
          '<li class="menu-item"><a ng-click="dtHamburgerMenu.closeMenu()" ng-href="/#/mempool">Mempool</a></li>',
          '<li class="menu-item"><a ng-click="dtHamburgerMenu.closeMenu()" ng-href="/#/pools">Pools Monitor</a></li>',
          '<li class="menu-item"><a ng-click="dtHamburgerMenu.closeMenu()" ng-href="/#/remotes">Remote Nodes</a></li>',
          '<li class="menu-item"><a ng-click="dtHamburgerMenu.closeMenu()" ng-href="/#/paperwallet">Paper Wallet</a></li>',
        '</ul>',
        '<hr>',
        '<p class="text-center social-links">',
          '<a href="https://alloyproject.org/discord" target="_blank"><i class="fab fa-discord fa-2x"></i></a>',
          '<a href="https://alloyproject.org/telegram" target="_blank"><i class="fab fa-telegram fa-2x"></i></a>',
          '<a href="https://alloyproject.org/reddit" target="_blank"><i class="fab fa-reddit fa-2x"></i></a>',
          '<a href="https://alloyproject.org/twitter" target="_blank"><i class="fab fa-twitter fa-2x"></i></a>',
          '<a href="https://alloyproject.org/github" target="_blank"><i class="fab fa-github fa-2x"></i></a>',
        '</p>',
        '<p class="text-center"></p>',
        '<p class="text-center"></p>',
      '</div>',
      '<div class="hamburger-backdrop" ng-class="{active: dtHamburgerMenu.isShowingMenu}" ng-click="dtHamburgerMenu.closeMenu()"></div>'
    ].join(''))
  }]);
