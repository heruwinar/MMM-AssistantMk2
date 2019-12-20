//
// Module : MMM-AssistantMk2
// ver 3
//


var _log = function() {
  var context = "[AMK2]";
  return Function.prototype.bind.call(console.log, console, context);
}()

var log = function() {
  //do nothing
}


Module.register("MMM-AssistantMk2", {
  defaults: {
    debug:true,
    assistantConfig: {
      credentialPath: "credentials.json",
      projectId: "",
      modelId: "",
      instanceId: "",
      latitude: 51.508530,
      longitude: -0.076132,
    },
    responseConfig: {
      useScreenOutput: true,
      useAudioOutput: true,
      useChime: true,
      timer: 5000,
      screenOutputCSS: "screen_output.css",
    },
    micConfig: {
      recorder: "sox",
      device: null,
    },
    customActionConfig: {
      autoMakeAction: false,
      autoUpdateAction: false,
      // actionLocale: "en", // multi language action is not supported yet
    },
    recipes: [],
    transcriptionHooks: {},
    actions: {},
    commands: {},
    plugins: {},
    defaultProfile: "default",
    profiles: {
      "default": {
        profileFile: "default.json",
        lang: "en-US"
      }
    },
  },

  plugins: {
    onReady: [],
    onBeforeAudioResponse: [],
    onAfterAudioResponse: [],
    onBeforeScreenResponse: [],
    onAfterScreenResponse: [],
    onBeforeInactivated: [],
    onAfterInactivated: [],
    onBeforeActivated: [],
    onAfterActivated: [],
    onError: [],
    onBeforeNotificationReceived: [],
    onAfterNotificationReceived: [],
    onBeforeSocketNotificationReceived: [],
    onAfterSocketNotificationReceived: [],
  },
  commands: {},
  actions: {},
  transcriptionHooks: {},
  responseHooks: {},

  getScripts: function() {
    return [
      "/modules/MMM-AssistantMk2/library/response.class.js",
      "/modules/MMM-AssistantMk2/library/response.js",
    ]
  },

  getStyles: function () {
    return ["MMM-AssistantMk2.css"]
  },

  getTranslations: function() {
    return {
      en: "translations/en.json",
      fr: "translations/fr.json"
    }
  },

  start: function () {
    const helperConfig = [
      "debug", "recipes", "customActionConfig", "assistantConfig", "micConfig",
      "responseConfig"
    ]
    this.helperConfig = {}
    if (this.config.debug) log = _log

    this.config = this.configAssignment({}, this.defaults, this.config)
    for(var i = 0; i < helperConfig.length; i++) {
      this.helperConfig[helperConfig[i]] = this.config[helperConfig[i]]
    }
    this.registerPluginsObject(this.config.plugins)
    this.registerResponseHooksObject(this.config.responseHooks)
    this.registerTranscriptionHooksObject(this.config.transcriptionHooks)
    this.registerCommandsObject(this.config.commands)
    this.registerActionsObject(this.config.actions)
    this.setProfile(this.config.defaultProfile)
    this.session = {}

    var callbacks = {
      assistantActivate: (payload, session)=>{
        this.assistantActivate(payload, session)
      },
      postProcess: (response, callback_done, callback_none)=>{
        this.postProcess(response, callback_done, callback_none)
      },
      endResponse: ()=>{
        this.endResponse()
      },
      sendNotification: (noti, payload=null) => {
        this.sendNotification(noti, payload)
      },
      translate: (text) => {
        return this.translate(text)
      }
    }
    this.assistantResponse = new AssistantResponse(this.helperConfig["responseConfig"], callbacks)
  },

  doPlugin: function(pluginName, args) {
    if (this.plugins.hasOwnProperty(pluginName)) {
      var plugins = this.plugins[pluginName]
      if (Array.isArray(plugins) && plugins.length > 0) {
        for (var i = 0; i < plugins.length; i++) {
          var job = plugins[i]
          this.doCommand(job, args, pluginName)
        }
      }
    }
  },

  registerPluginsObject: function (obj) {
    for (var pop in this.plugins) {
      if (obj.hasOwnProperty(pop)) {
        var candi = []
        if (Array.isArray(obj[pop])) {
          candi = candi.concat(obj[pop])
        } else {
          candi.push(obj[pop].toString())
        }
        for (var i = 0; i < candi.length; i++) {
          this.registerPlugin(pop, candi[i])
        }
      }
    }
  },

  registerPlugin: function (plugin, command) {
    if (this.plugins.hasOwnProperty(plugin)) {
      if (Array.isArray(command)) {
        this.plugins[plugin].concat(command)
      }
      this.plugins[plugin].push(command)
    }
  },

  registerCommandsObject: function (obj) {
    this.commands = Object.assign({}, this.commands, obj)
  },

  registerTranscriptionHooksObject: function (obj) {
    this.transcriptionHooks = Object.assign({}, this.transcriptionHooks, obj)
  },

  registerActionsObject: function (obj) {
    this.actions = Object.assign({}, this.actions, obj)
  },

  registerResponseHooksObject: function (obj) {
    this.responseHooks = Object.assign({}, this.responseHooks, obj)
  },


  t: function(a) {
    log("!!!!!", a)
  },

  configAssignment : function (result) {
    var stack = Array.prototype.slice.call(arguments, 1)
    var item
    var key
    while (stack.length) {
      item = stack.shift()
      for (key in item) {
        if (item.hasOwnProperty(key)) {
          if (
            typeof result[key] === "object" && result[key]
            && Object.prototype.toString.call(result[key]) !== "[object Array]"
          ) {
            if (typeof item[key] === "object" && item[key] !== null) {
              result[key] = this.configAssignment({}, result[key], item[key])
            } else {
              result[key] = item[key]
            }
          } else {
            result[key] = item[key]
          }
        }
      }
    }
    return result
  },

  getDom: function() {
    return this.assistantResponse.getDom()
  },

  setProfile: function(profileName) {
    if (this.config.profiles.hasOwnProperty(profileName)) {
      this.profile = profileName
    }
  },

  notificationReceived: function(noti, payload=null, sender=null) {
    this.doPlugin("onBeforeNotificationReceived", {notification:noti, payload:payload})
    switch (noti) {
      case "DOM_OBJECTS_CREATED":
        this.sendSocketNotification("INIT", this.helperConfig)
        this.assistantResponse.prepare()
        break
      case "ASSISTANT_PROFILE":
        this.setProfile(payload)
        break
      case "ASSISTANT_ACTIVATE":
        this.doPlugin("onBeforeActivated", payload)
        var session = Date.now()
        payload.secretMode = (payload.secretMode) ? payload.secretMode : false
        this.assistantResponse.setSecret(payload.secretMode)
        if (typeof payload.callback == "function") {
          this.session[session] = {
            callback: payload.callback,
            sender: (sender) ? sender.name : sender,
          }
          delete payload.callback
        }
        this.assistantResponse.fullscreen(true)
        this.assistantActivate(payload, session)
        this.doPlugin("onAfterActivated", payload)
        break
      case "ASSISTANT_COMMAND":
        this.doCommand(payload.command, payload.param, sender.name)
        break
     }
     this.doPlugin("onAfterNotificationReceived", {notification:noti, payload:payload})
  },

  socketNotificationReceived: function(noti, payload) {
    switch(noti) {
      case "LOAD_RECIPE":
        this.parseLoadedRecipe(payload)
        break
      case "INITIALIZED":
        log("Initialized.")
        this.assistantResponse.status("standby")
        this.doPlugin("onReady")
        break
      case "ASSISTANT_RESULT":
        if (payload.session && this.session.hasOwnProperty(payload.session)) {
          var session = this.session[payload.session]
          if (typeof session.callback == "function") {
            MM.getModules().enumerate((module) => {
              if (module.name == session.sender) {
                session.callback(Object.assign({}, payload), module)
              }
            })
          }
          delete this.session[payload.session]
        }
        this.assistantResponse.start(payload)
        break
      case "TUNNEL":
        this.assistantResponse.tunnel(payload)
        break
    }
  },

  parseLoadedRecipe: function(payload) {
    let reviver = (key, value) => {
      if (typeof value === 'string' && value.indexOf('__FUNC__') === 0) {
        value = value.slice(8)
        let functionTemplate = `(${value})`
        return eval(functionTemplate)
      }
      return value
    }
    var p = JSON.parse(payload, reviver)

    if (p.hasOwnProperty("commands")) {
      this.registerCommandsObject(p.commands)
    }
    if (p.hasOwnProperty("actions")) {
      this.registerActionsObject(p.actions)
    }
    if (p.hasOwnProperty("transcriptionHooks")) {
      this.registerTranscriptionHooksObject(p.transcriptionHooks)
    }
    if (p.hasOwnProperty("responseHooks")) {
      this.registerResponseHooksObject(p.responseHooks)
    }
    if (p.hasOwnProperty("plugins")) {
      this.registerPluginsObject(p.plugins)
    }
  },

  suspend: function() {
    log("This module cannot be suspended.")
  },

  resume: function() {
    log("This module cannot be resumed.")
  },

  assistantActivate: function(payload, session) {
    if(!this.continue) this.lastQuery = null //needed -> always false?
    this.continue = false // needed ?
    var options = {
      type: "TEXT",
      profile: this.config.profiles[this.profile],
      key: null,
      lang: null,
      useScreenOutput: this.config.responseConfig.useScreenOutput,
      useAudioOutput: this.config.responseConfig.useAudioOutput,
      session: session,
    }
    
    var options = Object.assign({}, options, payload)
    if (payload.hasOwnProperty("profile") && typeof this.config.profiles[payload.profile] !== "undefined") {
      options.profile = this.config.profiles[payload.profile]
    }
    this.sendSocketNotification("ACTIVATE_ASSISTANT", options)
    this.assistantResponse.status(options.type, true)
  },

  endResponse: function() {
    this.doPlugin("onAfterInactivated")
  },

  postProcess: function (response, callback_done=()=>{}, callback_none=()=>{}) {
    var foundHook = []
    foundHook = this.findAllHooks(response)
    if (foundHook.length > 0) {
      this.assistantResponse.status("hook")
      for (var i = 0; i < foundHook.length; i++) {
        var hook = foundHook[i]
        this.doCommand(hook.command, hook.params, hook.from)
      }
      callback_done()
    } else {
      callback_none()
    }
  },

  findAllHooks: function (response) {
    var hooks = []
    hooks = hooks.concat(this.findTranscriptionHook(response))
    hooks = hooks.concat(this.findAction(response))
    hooks = hooks.concat(this.findResponseHook(response))
    return hooks
  },

  findResponseHook: function (response) {
    var found = []
    console.log(1, response, response.screen)
    if (response.screen) {
      var res = []
      res.links = (response.screen.links) ? response.screen.links : []
      res.text = (response.screen.text) ? [].push(response.screen.text) : []
      res.photos = (response.screen.photos) ? response.screen.photos : []
      console.log(123, this.responseHooks)
      for (var k in this.responseHooks) {
        console.log(2, k)
        if (!this.responseHooks.hasOwnProperty(k)) continue
        var hook = this.responseHooks[k]
        console.log(3, hook)
        if (!hook.where || !hook.pattern || !hook.command) continue
        var pattern = new RegExp(hook.pattern, "ig")
        var f = pattern.exec(res[hook.where])
        console.log(hook.pattern, pattern, f)
        if (f) {
          found.push({
            "from": k,
            "params":f,
            "command":hook.command
          })
          log("ResponseHook matched:", k)
        }
      }
    }
    console.log("re", found)
    return found
  },
  
  findAction: function (response) {
    var found = []
    var action = (response.action) ? response.action : null
    if (!action || !action.inputs) return []
    for (var i = 0; i < action.inputs.length; i++) {
      var input = action.inputs[i]
      if (input.intent == "action.devices.EXECUTE") {
        var commands = input.payload.commands
        for (var j = 0; j < commands.length; j++) {
          var execution = commands[j].execution
          for (var k = 0; k < execution.length; k++) {
            var exec = execution[k]
            found.push({
              "from":"CUSTOM_DEVICE_ACTION",
              "params":exec.params,
              "command":exec.command
            })
          }
        }
      }
    }
    return found

  },

  findTranscriptionHook: function (response) {
    var foundHook = []
    var transcription = (response.transcription) ? response.transcription.transcription : ""
    for (var k in this.transcriptionHooks) {
      if (!this.transcriptionHooks.hasOwnProperty(k)) continue
      var hook = this.transcriptionHooks[k]
      if (hook.pattern && hook.command) {
        var pattern = new RegExp(hook.pattern, "ig")
        var found = pattern.exec(transcription)
        if (found) {
          foundHook.push({
            "from":k,
            "params":found,
            "command":hook.command
          })
          log("TranscriptionHook matched:", k)
        }
      } else {
        log(`TranscriptionHook:${k} has invalid format`)
        continue
      }
    }
    return foundHook
  },

  doCommand: function (commandId, originalParam, from) {
    this.assistantResponse.doCommand(commandId, originalParam, from)
    if (this.commands.hasOwnProperty(commandId)) {
      var command = this.commands[commandId]
    } else {
      log(`Command ${commandId} is not found.`)
      return
    }
    var param = (typeof originalParam == "object")
      ? Object.assign({}, originalParam) : originalParam

    if (command.hasOwnProperty("notificationExec")) {
      var ne = command.notificationExec
      if (ne.notification) {
        var fnen = (typeof ne.notification == "function") ?  ne.notification(param, from) : ne.notification
        var nep = (ne.payload) ? ((typeof ne.payload == "function") ?  ne.payload(param, from) : ne.payload) : null
        var fnep = (typeof nep == "object") ? Object.assign({}, nep) : nep
        log (`Command ${commandId} is executed (notificationExec).`)
        this.sendNotification(fnen, fnep)
      }
    }

    if (command.hasOwnProperty("shellExec")) {
      var se = command.shellExec
      if (se.exec) {
        var fs = (typeof se.exec == "function") ? se.exec(param, from) : se.exec
        var so = (se.options) ? ((typeof se.options == "function") ? se.options(param, from) : se.options) : null
        var fo = (typeof so == "function") ? so(param, key) : so
        log (`Command ${commandId} is executed (shellExec).`)
        this.sendSocketNotification("SHELLEXEC", {command:fs, options:fo})
      }
    }

    if (command.hasOwnProperty("moduleExec")) {
      var me = command.moduleExec
      var mo = (typeof me.module == 'function') ? me.module(param, from) : me.module
      var m = (Array.isArray(mo)) ? mo : new Array(mo)
      if (typeof me.exec == "function") {
        MM.getModules().enumerate((mdl)=>{
          if (m.length == 0 || (m.indexOf(mdl.name) >=0)) {
            log (`Command ${commandId} is executed (moduleExec) for :`, mdl.name)
            me.exec(mdl, param, from)
          }
        })
      }
    }

    if (command.hasOwnProperty("functionExec")) {
      var fe = command.functionExec
      if (typeof fe.exec == "function") {
        log (`Command ${commandId} is executed (functionExec)`)
        fe.exec(param, from)
      }
    }

    if (command.hasOwnProperty("soundExec")) {
      var se = command.sound
      if (se.chime && typeof se.chime == 'string') {
        if (se.chime == "open") this.playChime("Google_beep_open")
        if (se.chime == "close") this.playChime("Google_beep_close")
      }
      if (se.say && typeof se.say == 'string' && this.config.responseConfig.myMagicWord) {
        this.notificationReceived("ASSISTANT_SAY", se.say , this.name)
      }
    }
  },

  /** Optional TelegramBot Commands **/
/*  
  getCommands: function () {
    return [
      {
        command: "q",
        callback: "telegramCommand",
        description: this.translate("QUERY_HELP")
      },
      {
        command: "s",
        callback: "telegramCommand",
        description: this.translate("SAY_HELP")
      }
    ]
  },

  telegramCommand: function(command, handler) {
    if (command == "q" && handler.args) {
      handler.reply("TEXT", this.translate("QUERY_REPLY"))
      this.notificationReceived("ASSISTANT_QUERY", handler.args, "MMM-TelegramBot")
    }
    if (command == "s" && handler.args) {
      handler.reply("TEXT", this.translate("SAY_REPLY") + handler.args)
      this.notificationReceived("ASSISTANT_SAY", handler.args, "MMM-TelegramBot")
    }
  },
*/
  /** demo for check if icons are ok ... (or for video demo later?) **/
  
  demo: function() {
    var allStatus = [ "hook", "standby", "reply", "error", "think", "continue", "listen", "confirmation" ]
    var myStatus = document.getElementById("AMK2_STATUS")
    var i = 0
    for (let [item,value] of Object.entries(allStatus)) {
      setTimeout(() => {
        this.assistantResponse.status(value)
        if (value == "listen") this.assistantResponse.playChime("beep")
        this.assistantResponse.showTranscription("icon: " + value)
        if (item == 7) setTimeout(() => { 
          this.assistantResponse.status("standby")
          this.assistantResponse.showTranscription(" ")
        } , 4000)
      }, 1000 + i)
      i += 4000
    }
  }
})
