'use strict'

const gpf = require('gpf-js')
const deasync = require('deasync')
const resources = require('./resources')
const $events = Symbol('events')
const $content = Symbol('content')
const $request = Symbol('request')
const $headers = Symbol('headers')
const events = 'readystatechange,load'.split(',')

// Simple XHR hook to load resources and bypass CORS

module.exports = (settings, XMLHttpRequest) => {
  XMLHttpRequest.prototype.addEventListener = function (eventName, eventHandler) {
    if (!this[$events]) {
      this[$events] = {}
    }
    if (!this[$events][eventName]) {
      this[$events][eventName] = []
    }
    this[$events][eventName].push(eventHandler)
  }

  XMLHttpRequest.prototype.open = function (method, url, asynchronous) {
    this[$request] = {
      method,
      url,
      headers: {},
      asynchronous: asynchronous !== false
    }
    if (method === 'GET') {
      this[$content] = resources.read(Object.assign({}, settings, { verbose: false }), url)
    }
  }

  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (this[$content] === undefined) {
      this[$request].headers[name] = value
    }
  }

  function _setResult (xhr, responseText, status) {
    if (settings.verbose) {
      const request = xhr[$request]
      let report
      if (status.toString().startsWith(2)) {
        report = `${status} ${responseText.length}`.green
      } else {
        report = status.toString().red
      }
      if (xhr[$content]) {
        report += ' sync resource'.magenta
      } else if (!request.asynchronous) {
        report += ' synchronous'.magenta
      }
      console.log('XHR'.magenta, `${request.method} ${request.url}`.cyan, report)
    }
    Object.defineProperty(xhr, 'readyState', { get: () => 4 })
    Object.defineProperty(xhr, 'responseText', { get: () => responseText || '' })
    Object.defineProperty(xhr, 'status', { get: () => status })
    if (xhr.onreadystatechange) {
      xhr.onreadystatechange()
    }
    if (xhr[$events]) {
      events.forEach(eventName => xhr[$events][eventName]
        ? xhr[$events][eventName].forEach(eventHandler => eventHandler(xhr))
        : 0
      )
    }
  }

  XMLHttpRequest.prototype.send = function (data) {
    events.forEach(eventName => this[`on${eventName}`]
      ? this.addEventListener(eventName, this[`on${eventName}`])
      : 0
    )
    const content = this[$content]
    if (undefined !== content) {
      this[$headers] = {}
      _setResult(this, content || '', content !== null ? 200 : 404)
    } else {
      const request = this[$request]
      request.data = data
      let requestInProgress = true
      gpf.http.request(request).then(response => {
        this[$headers] = response.headers
        _setResult(this, response.responseText, response.status)
        requestInProgress = false
      })
      if (!request.asynchronous) {
          deasync.loopWhile(() => requestInProgress)
      }
    }
  }

  XMLHttpRequest.prototype.getAllResponseHeaders = function () {
    return Object.keys(this[$headers]).reduce((list, name) => {
      list.push(name + ': ' + this[$headers][name])
      return list
    }, []).join('\r\n')
  }

  XMLHttpRequest.prototype.getResponseHeader = function (name) {
    return this[$headers][name] || null
  }
}
