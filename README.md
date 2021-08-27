# TypeAssert
Minimal JavaScript type assertions

## Basic usage
```javascript
// or you use import if use ESM
const { typeAssert } = require('./typeAssert.cjs')

// simple types
typeAssert(1, 'number')
typeAssert('2', 'string')

// object
typeAssert({ x: 1, y: 3 }, 'object')
typeAssert({ x: 1, y: 3 }, {})

// array
typeAssert([1, 2, 3], 'Array')
typeAssert([1, 2, 3], [])

// object fields
typeAssert({
    x: 1,
    y: '2'
}, {
    x: 'number',
    y: 'string'
})

// array elements
typeAssert([1, 2, 3], ['number'])

// "sum" types
const assertion = 'string'.sumWith('number')
typeAssert('abc', assertion)
typeAssert(123, assertion)

// nullable types
const assertion = { x: 'number', y: 'function' }.orNull()
typeAssert({
    x: 144,
    y: () => {}
}, assertion)
typeAssert(null, assertion)

// nullable shorthand for simple types
typeAssert(114, 'number?')
typeAssert(null, 'number?')

// nested situation
const assertion = {
    a: 'number',
    b: 'string',
    c: [
        {
            x: 'function',
            y: 'function'
        }.sumWith({
            x: [],
            y: {}
        }).orNull()
    ]
}

typeAssert({
    a: 114,
    b: '514',
    c: [
        null,
        {
            x: [1, 2, 3],
            y: {
                z: '4'
            }
        },
        {
            x: console.log,
            y: Array.prototype.push
        }
    ]
}, assertion)

// chained situation
typeAssert(5, 'number'.chainWith(x => x > 0 ? true : 'no negative numbers'))
```
