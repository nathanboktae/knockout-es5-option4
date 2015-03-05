(function(factory) {
  if (typeof define === 'function' && define.amd) {
    define(['knockout'], factory)
  } else if (typeof exports === 'object' && typeof module === 'object') {
    /*global module*/
    module.exports = factory(require('knockout'))
  } else {
    /*global ko*/
    factory(ko)
  }
})(function(ko) {

  var deepObservifyArray = function(arr, merge, deep, arrayMapping) {
    for (var i = 0, len = merge.length; i < len; i++) {
      // TODO circular reference protection
      if (merge[i] != null && typeof merge[i] == 'object' &&
          arr[i] != null && typeof arr[i] == 'object') {
        if (deep && Array.isArray(arr[i])) {
          deepObservifyArray(arr[i], merge[i], deep, arrayMapping)
        } else {
          ko.observifyModel(arr[i], merge[i], deep, arrayMapping)
        }
      } else if (arr[i] !== merge[i]) {
        arr[i] = ko.observableModel(merge[i])
      }
    }
  },
  defineProperty = function(type, obj, prop, def, deep, arrayMapping) {
    if (obj == null || typeof obj != 'object' || typeof prop != 'string') {
      throw new Error('invalid arguments passed')
    }

    if (Object.prototype.toString.call(def) === '[object Array]' && type === 'observable') {
      type = 'observableArray'
    }

    var descriptor = Object.getOwnPropertyDescriptor(obj, prop)
    if (!descriptor || (!descriptor.get && !descriptor.set)) {
      if (descriptor) delete obj[prop]

      var obv = ko[type](def)
      Object.defineProperty(obj, prop, {
        set: function(value) { obv(value) },
        get: function() { return obv() },
        enumerable: true,
        configurable: true
      })

      Object.defineProperty(obj, '_' + prop, {
        get: function() { return obv },
        enumerable: false
      })

      if (type === 'observableArray') {
        var update = function(arr) {
          if (Array.isArray(arr) && !Object.getOwnPropertyDescriptor(arr, 'push')) {
            ['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'].forEach(function(f) {
              // sadly we can't just use ko.observableArray.fn's functions, as it doesn't call
              // Array.prototype[f].apply but on the object, resulting in infinite recursion.
              Object.defineProperty(arr, f, {
                value: function() {
                  obv.valueWillMutate()
                  var result = Array.prototype[f].apply(obv.peek(), arguments)
                  obv.valueHasMutated()
                  return result
                }
              })
            })
          }
        }
        obv.subscribe(update)
        update(def)
      }
    }

    var current = obj[prop]
    if (deep !== false && (current != null && typeof current == 'object')) {
      ko.observifyModel(current, def, deep, arrayMapping, prop)
      // if the current propery is an observable array property, notify it's subscribers that it changed
      if (Array.isArray(current) && current !== def && obj['_' + prop]) {
        obj['_' + prop].notifySubscribers()
      }
    } else if (current !== def) {
      obj[prop] = def
    }
  }

  ko.utils.defineObservableProperty = defineProperty.bind(null, 'observable')
  ko.utils.defineComputedProperty = defineProperty.bind(null, 'computed')

  ko.observifyModel = function(model, defaults, deep, arrayMapping, parentProp) {
    var def, prop
    if (arguments.length === 1 || typeof defaults === 'boolean') {
      arrayMapping = deep
      deep = defaults
      defaults = model
    }

    if (defaults == null || typeof defaults != 'object') {
      return defaults
    }

    if (Array.isArray(model)) {
      // specially handle merging arrays if a mapping exists at all, a map exists for
      // this particular array, and if both sides are an array
      if (arrayMapping && parentProp && typeof arrayMapping === 'object' &&
          arrayMapping[parentProp] && Array.isArray(defaults)) {
        var itemProp = arrayMapping[parentProp],
            len = defaults.length,
            mappedDefaults = []

        model.forEach(function(modelItem) {
          var defaultsItem, def, idx
          if (modelItem != null && typeof modelItem === 'object') {
            var modelItemProp = modelItem[itemProp]
            for (idx = 0; idx < len; idx++) {
              def = defaults[idx]
              if (def && (def[itemProp] === modelItemProp)) {
                defaultsItem = def
                break
              }
            }
          }

          if (defaultsItem != null) {
            mappedDefaults.push(defaultsItem)
            delete defaults[idx]
          } else {
            mappedDefaults.push(modelItem)
          }
        })
        // filter (x) -> true makes an array not sparse
        defaults = mappedDefaults.concat(defaults.filter(function(x) { return true }))
      }

      deepObservifyArray(model, defaults, deep, arrayMapping)
    } else {
      for (prop in defaults) {
        if (defaults.hasOwnProperty(prop)) {
          def = defaults[prop]
          if (!def || !ko.isSubscribable(def)) {
            ko.utils.defineObservableProperty(model, prop, def, deep, arrayMapping)
          } else {
            model[prop] = def
          }
        }
      }
    }

    return model
  }

  ko.observableModel = function(defaults, deep, arrayMapping) {
    return ko.observifyModel({}, defaults, deep, arrayMapping)
  }

  return ko
})