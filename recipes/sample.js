var recipe = {
  action: {
    "test": {
      "patterns": [
        "hide $SchemaOrg_Text:modulename",
        "remove $SchemaOrg_Text:modulename"
      ],
      "parameters": [
        {
          "name": "modulename",
          "type": "SchemaOrg_Text"
        }
      ],
      "response": "Yes, sir! I'll hide $modulename",
      "commandName": "COMMAND_TEST",
      "commandParams": {
        "module": "$modulename",
      },
    },
    "test3": {
      "patterns": [
        "play yt",
      ],
      "response": "ok",
    }
  },

}

exports.recipe = recipe // Don't remove this line.
