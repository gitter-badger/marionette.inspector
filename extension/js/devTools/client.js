define([
  'marionette',
  'client/backboneAgent',
  'client/inspectedPage'
], function(Marionette, backboneAgent, inspectedPage) {


  var DevToolClient = Marionette.Object.extend({

    initialize: function() {
      this.backboneAgent = backboneAgent;
      this.inspectedPage = inspectedPage;

      this.exec = _.bind(this.exec, this);
      this.waitForAppLoad = _.bind(this.waitForAppLoad, this);
      this.listenTo(this.inspectedPage, 'ready', function () {
        this.trigger('page:ready');
      });
    },

    start: function() {
      this.backboneAgent.activate();
      this.setupInspectedPageClient();
    },

    exec: function(fnc, args) {
      return this.backboneAgent.exec(fnc, args);
    },

    fetchAppData: function(dataType) {

      var _appData = function(dataType) {
        return this.appObserver[dataType]()
      };

      return this.waitForClientLoad()
        .then(this.waitForAppLoad())
        .then(this.exec.bind(this, _appData, [dataType]))
        .catch(function(e) {
          console.log('fetchData failed to get data', e.message);
        });
    },

    waitForAppLoad: function() {
      var that = this;
      var promise = this.backboneAgent.waitFor(function() {
        return this.appObserver.isAppLoaded();
      });

      promise.catch(function(e) {
        console.log('waitForAppData: could not find app');
        that.trigger('app:load-failed');
      });

      return promise;
    },

    waitForClientLoad: function() {
      var promise = this.backboneAgent.waitFor(function() {
        return !_.isUndefined(this.appObserver);
      });

      promise.catch(function(e) {
        console.log('waitForClientLoad: client failed to laod');
      });

      return promise;
    },

    setupInspectedPageClient: function() {

      this.debugMode = false;

      this.listenTo(this.inspectedPage, "updated", _.bind(function(updateDetails) {
          if (this.inspectedPage.isInjecting) {
              // we are injecting scripts into the inspected page
              // => reload the panel to wait for injected scripts loading (i.e. backbone agent)
              // window.location.href = "";
          } else {
              // if the inspected page still has the backbone agent, then the update isn't a
              // "real one" (e.g. is an hash change / push state, etc.) and we can ignore it.
              // Note: as a side effect, if the agent isn't in the inspected page because we are
              // in a waiting or debug disabled view, than the update is always considered as real
              this.backboneAgent.isActive(_.bind(function(isActive) {
                  if (!isActive) { // the update is "real"
                      if (updateDetails.urlChanged || !this.debugMode) {
                          // the user moved to another page/app/site or refreshed the page
                          // while not in debug mode
                          // => reload the panel to show the view for activating debugging

                          // something weird
                          // window.location.href = "";
                      } else {
                          // the update is a refresh while in debug mode
                          // => reinject the backbone agent to keep the debug mode running
                          this.restartAppInDebugMode();
                      }
                  }
              }, this));
          }
      }, this));
    }
  });


  return new DevToolClient();
});
