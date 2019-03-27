'use strict'

require('colors')

function assert (code) {
  let message = code.toString().match(/(?:=>|{)([^}]*)\}?/)[1].toString().trim()
  let condition
  try {
    condition = code()
  } catch (e) {
    condition = false
    message += ' ' + e.toString().gray
  }
  if (condition) {
    console.log('OK'.green, message)
  } else {
    console.error('KO'.red, message)
  }
}

const Node = require('../../src/mindom/Node')
const Window = require('../../src/mindom/Window')
const window = new Window({
  baseURL: 'http://localhost'
})
assert(() => window)

const parser = new window.DOMParser()
assert(() => parser)

function parse (string) {
  console.log(string.yellow)
  const doc = parser.parseFromString(string)
  console.log(doc.innerHTML.gray)
  return doc
}

const tests = [() => {
  const doc = parse('<html />')
  assert(() => doc.nodeType === Node.DOCUMENT_NODE)
  const html = doc.firstChild
  assert(() => html && html.nodeType === Node.ELEMENT_NODE)
  assert(() => html.nodeName === 'html')
  assert(() => html.childNodes.length === 0)
}, () => {
  const doc = parse('<html style="border: 1px;"/>')
  assert(() => doc.nodeType === Node.DOCUMENT_NODE)
  const html = doc.firstChild
  assert(() => html && html.nodeType === Node.ELEMENT_NODE)
  assert(() => html.nodeName === 'html')
  assert(() => html.childNodes.length === 0)
  assert(() => html.getAttribute('style') === 'border: 1px;')
}, () => {
  const doc = parse('<html><head /><body><h1>Hello</h1></body></html>')
  assert(() => doc.nodeType === Node.DOCUMENT_NODE)
  const html = doc.firstChild
  assert(() => html && html.nodeType === Node.ELEMENT_NODE)
  assert(() => html.nodeName === 'html')
  assert(() => html.childNodes.length === 2)
  const head = html.childNodes[0]
  assert(() => head && head.nodeType === Node.ELEMENT_NODE)
  assert(() => head.nodeName === 'head')
  const body = html.childNodes[1]
  assert(() => body && body.nodeType === Node.ELEMENT_NODE)
  assert(() => body.nodeName === 'body')
  const h1 = body.firstChild
  assert(() => h1 && h1.nodeType === Node.ELEMENT_NODE)
  assert(() => h1.nodeName === 'h1')
  assert(() => h1.textContent === 'Hello')
}]

tests.forEach(test => {
  try {
    test()
  } catch (e) {
    console.error('KO'.red, e)
  }
})
