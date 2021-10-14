# TypeAssert
Yet another type assertion library.

## Importing
Till now this stuff is published nowhere. Just copy the released `.js` (if you use ESM) or `.cjs` (if you use CJS) file to your project would be fine.

## Basic usages & Advantages

 - Assert your object's type with `typeAssert`

```js
const { typeAssert } = require('./typeAssert')

typeAssert(1, 'number')
typeAssert('2', 'string')
```

 - Build complex assertions intuitively

```js
typeAssert({
  x: 1,
  y: '2',
  z: [3, 4, 5],
  t: { a: [ '6', null ] }
}, {
  x: 'number',
  y: 'string',
  z: ['number'],
  t: {
    a: [ 'string?' ]
  }
})
```

 - Easily extend the functionalities
```
typeAssert(5, 'number'.assertValue(5))
typeAssert([1, 2, 3], ['number'].chainWith(x => x.length >= 2))
```

 - Intuitive error messages
 
```js
typeAssert({
    x: 1,
    y: '2',
    z: [3, 4, 5],
    t: { a: [ '5', '6', null, 7, '8' ] } // here is a number 7
}, {
    x: 'number',
    y: 'string',
    z: ['number'],
    t: {
        a: [ 'string?' ]
    }
})

// error message:
//   Trace: Type assertion failed: "object.t.a[3]": expected type "string", got "number"
```

For more examples, check out `test.cjs`. That's all, thanks

## Donate
You don't.

