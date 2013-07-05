describe('security', function() {

  var $rootScope, $http, $httpBackend, status, userInfo;
  
  angular.module('test',[]).constant('I18N.MESSAGES', messages = {});
  beforeEach(module('security', 'services.titleService', 'test', 'scripts/common/security/login/assets/templates/form.tpl.html'));
  beforeEach(inject(function(_$rootScope_, _$httpBackend_, _$http_) {
    $rootScope = _$rootScope_;
    $httpBackend = _$httpBackend_;
    $http = _$http_;

    userInfo = { id: '1234567890', email: 'jo@bloggs.com', first: 'Jo', last: 'Bloggs'};
    $httpBackend.when('GET', '/api/user/current-user').respond(200, { user: userInfo });
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  var security, queue;
  beforeEach(inject(function($injector) {
    security = $injector.get('security');
    queue = $injector.get('securityRetryQueue');
  }));

  describe('showLogin', function() {
    it('should open the dialog', function() {
      security.showLogin();
      $rootScope.$digest();
      var div = document.querySelector('.login-form');
      expect(angular.element(div).length).toBeGreaterThan(0);
    });
  });

  describe('login', function() {
    it('sends a http request to login the specified user', function() {
      $httpBackend.when('POST', '/api/user/login').respond(200, { user: userInfo });
      $httpBackend.expect('POST', '/api/user/login');
      security.login('email', 'password');
      $httpBackend.flush();
      expect(security.currentUser).toBe(userInfo);
    });
    it('calls queue.retry on a successful login', function() {
      $httpBackend.when('POST', '/api/user/login').respond(200, { user: userInfo });
      spyOn(queue, 'retryAll');
      security.showLogin();
      security.login('email', 'password');
      $httpBackend.flush();
      $rootScope.$digest();
      expect(queue.retryAll).toHaveBeenCalled();
      expect(security.currentUser).toBe(userInfo);
    });
    it('does not call queue.retryAll after a login failure', function() {
      $httpBackend.when('POST', '/api/user/login').respond(200, { user: null });
      spyOn(queue, 'retryAll');
      expect(queue.retryAll).not.toHaveBeenCalled();
      security.login('email', 'password');
      $httpBackend.flush();
      expect(queue.retryAll).not.toHaveBeenCalled();
    });
  });

  describe('logout', function() {
    beforeEach(function() {
      $httpBackend.when('POST', '/api/user/logout').respond(200, {});
    });

    it('sends a http post to clear the current logged in user', function() {
      $httpBackend.expect('POST', '/api/user/logout');
      security.logout();
      $httpBackend.flush();
    });

    it('redirects to / by default', function() {
      inject(function($location) {
        spyOn($location, 'path');
        security.logout();
        $httpBackend.flush();
        expect($location.path).toHaveBeenCalledWith('/');
      });
    });

    it('redirects to the path specified in the first parameter', function() {
      inject(function($location) {
        spyOn($location, 'path');
        security.logout('/other/path');
        $httpBackend.flush();
        expect($location.path).toHaveBeenCalledWith('/other/path');
      });
    });
  });

  describe('currentUser', function() {

    it('should be unauthenticated to begin with', function() {
      expect(security.isAuthenticated()).toBe(false);
      expect(security.isAdmin()).toBe(false);
      expect(security.currentUser).toBe(null);
    });
    it('should be authenticated if we update with user info', function() {
      var userInfo = {};
      security.currentUser = userInfo;
      expect(security.isAuthenticated()).toBe(true);
      expect(security.isAdmin()).toBe(false);
      expect(security.currentUser).toBe(userInfo);
    });
    it('should be admin if we update with admin user info', function() {
      var userInfo = { admin: true };
      security.currentUser = userInfo;
      expect(security.isAuthenticated()).toBe(true);
      expect(security.isAdmin()).toBe(true);
      expect(security.currentUser).toBe(userInfo);
    });

    it('should not be authenticated or admin if we clear the user', function() {
      var userInfo = { admin: true };
      security.currentUser = userInfo;
      expect(security.isAuthenticated()).toBe(true);
      expect(security.isAdmin()).toBe(true);
      expect(security.currentUser).toBe(userInfo);

      security.currentUser = null;
      expect(security.isAuthenticated()).toBe(false);
      expect(security.isAdmin()).toBe(false);
      expect(security.currentUser).toBe(null);
    });
  });

  describe('requestCurrentUser', function() {
    it('makes a GET request to current-user url', function() {
      expect(security.isAuthenticated()).toBe(false);
      $httpBackend.expect('GET', '/api/user/current-user');
      // $httpBackend.expect('GET', 'scripts/common/security/login/login.tpl.html');
      security.requestCurrentUser().then(function(data) {
        resolved = true;
        expect(security.isAuthenticated()).toBe(true);
        expect(security.currentUser).toBe(userInfo);
      });
      $httpBackend.flush();
      expect(resolved).toBe(true);
    });
    it('returns the current user immediately if they are already authenticated', function() {
      userInfo = {};
      security.currentUser = userInfo;
      expect(security.isAuthenticated()).toBe(true);
      security.requestCurrentUser().then(function(data) {
        resolved = true;
        expect(security.currentUser).toBe(userInfo);
      });
      expect(resolved).toBe(true);
    });
  });

});