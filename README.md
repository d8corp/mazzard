# Mazzard
### Install
```bash
npm i mazzard
```
Next we will use `mazzard` which means we imported it from `mazzard`
```javascript
import mazzard from 'mazzard'

mazzard() // undefined
```

### Primitive
`mazzard` returns the first argument as is, if it's type is not `function` or `object` (not `null`)
```javascript
mazzard(1) // 1
mazzard('1') // '1'
mazzard(false) // false
mazzard(null) // null
mazzard(NaN) // NaN
mazzard(Symbol('test')) // Symbol('test')
```

### Observable object
You get the observable object if a type of the first argument is `object`
```javascript
const observable = mazzard({test: 'success'})
return observable.test // 'success'
```
All objects inside observable is observable.
```javascript
const test = mazzard({observableField: {}})
test // is observable object
test.observableField // is observable object
```

### Observer
To have reactions on changes of observable object, use `mazzard` with a function as the first argument.
The function is observer and runs immediately.
```javascript
const test = mazzard({})

mazzard(
  () => console.log(test.testField) // this is observer
)
// console.log returns undefined

test.testField = 'success'
// console.log returns 'success'
```
Observer runs each time when you change observable fields.  
You may stop watching with the first argument of observer.
```javascript
const test = mazzard({})

mazzard(stop => {
  if (test.stop) {
    console.log('stop', test.stop)
    stop()
  } else {
    console.log(test.testField)
  }
})
// console.log returns undefined

test.testField = 'success'
// console.log returns 'success'

test.stop = 'test message'
// console.log returns ('stop', 'test message')
```
Also, you may stop it with that mazzard returns
```javascript
const stop = mazzard(() => {})
stop()
```
### United changes
If you wanna have only one reaction of observer on several changes, you may use a method of observable object
```javascript
const test = mazzard({
  update (field1, field2) {
    test.field1 = field1
    test.field2 = field2
  }
})

mazzard(() => {
  console.log(test.field1, test.field2)
})
// undefined, undefined

test.update(1, 2)
// 1, 2
```