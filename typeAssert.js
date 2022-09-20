'use strict'

/* eslint-disable no-extend-native, no-use-before-define, func-names, no-shadow, no-throw-literal */
export const TypeStrings = {
  String: typeof '',
  Symbol: typeof Symbol(''),
  Number: typeof 0,
  Object: typeof {},
  Boolean: typeof true,
  Function: typeof (() => {}),
  Undefined: typeof undefined,

  Array: Array.prototype.constructor.name,
  Date: Date.prototype.constructor.name,
  RegExp: RegExp.prototype.constructor.name
}

const removeTail = (srcText) => {
  const tail = srcText.slice(-1)
  if (tail === '?') {
    return [srcText.slice(0, -1), true]
  }
  return [srcText, false]
}

let globalPreventErr = false

export const preventErrTrace = prevent => {
  globalPreventErr = prevent
}

const typeAssertError = (path, message, preventErr) => {
  const errMsg = `Type assertion failed: "${path}": ${message}`
  if (!preventErr && !globalPreventErr) {
    console.trace(errMsg)
  }
  throw errMsg
}

const assertEquals = (path, expected, got, preventErr) => {
  if (expected !== got) {
    typeAssertError(path, `expected value "${expected}", got "${got}"`, preventErr)
  }
}

const assertTypeEqImpl = (path, expected, got, preventErr) => {
  if (expected !== got) {
    typeAssertError(path, `expected type "${expected}", got "${got}"`, preventErr)
  }
}

const assertTypeEqImpl2 = (path, expectedCtor, gotCtor, expected, preventErr) => {
  if (expectedCtor !== gotCtor) {
    typeAssertError(
      path,
      `expected type "${expected}", checking using ctor "${expectedCtor.name}", got "${gotCtor.name}"`,
      preventErr
    )
  }
}

const formatSumTypeError = (errors) => {
  let ret = 'sum type check failure:\n'
  for (const [idx, error] of Object.entries(errors)) {
    ret = `${ret}  - branch ${idx} failed for: { ${error} }\n`
  }
  return ret
}

const typeAssertImpl = (path, object, assertion, preventErr) => {
  const assertionType = typeof assertion
  if (assertion === null) {
    if (object !== null) {
      typeAssertError(path, `expected "null" value, got "${typeof object}"`, preventErr)
    }
  } else if (assertionType === TypeStrings.String) {
    const [type, nullable] = removeTail(assertion)
    if (nullable) {
      if (type === TypeStrings.Undefined) {
        typeAssertError(path, '"undefined" type cannot be nullable', preventErr)
      }
      if (object === null || object === undefined) {
        return
      }
    }
    if (object === null) {
      typeAssertError(path, 'unexpected "null" value', preventErr)
    }

    if (object !== undefined) {
      switch (type) {
        case TypeStrings.Array:
          assertTypeEqImpl2(path, Array.prototype.constructor, object.constructor, type, preventErr)
          return
        case TypeStrings.Date:
          assertTypeEqImpl2(path, Date.prototype.constructor, object.constructor, type, preventErr)
          return
        case TypeStrings.RegExp:
          assertTypeEqImpl2(path, RegExp.prototype.constructor, object.constructor, type, preventErr)
          return
        default:
        // fall through
      }
    }

    assertTypeEqImpl(path, type, typeof object, preventErr)
  } else if (assertionType === TypeStrings.Function) {
    const assertResult = assertion(object)
    if (assertResult !== true) {
      typeAssertError(path, assertResult, preventErr)
    }
  } else if (assertion.constructor === NullableType.prototype.constructor) {
    if (object === null || object === undefined) {
      return
    }
    typeAssertImpl(path, object, assertion.origin, preventErr)
  } else if (assertion.constructor === SumType.prototype.constructor) {
    const failures = []
    for (const type of assertion.types) {
      try {
        typeAssertImpl(path, object, type, true)
      } catch (error) {
        failures.push(error)
        continue
      }
      return
    }
    typeAssertError(path, formatSumTypeError(failures), preventErr)
  } else if (assertion.constructor === ChainType.prototype.constructor) {
    // eslint-disable-next-line guard-for-in
    for (const partIdx in assertion.types) {
      typeAssertImpl(`${path}:<${partIdx}>`, object, assertion.types[partIdx], preventErr)
    }
  } else if (assertion.constructor === ValueAssertion.prototype.constructor) {
    assertEquals(`${path}:value`, assertion.value, object, preventErr)
  } else if (assertion.constructor === ObjectValueAssertion.prototype.constructor) {
    typeAssertImpl(path, object, {}, preventErr)
    for (const [key, value] of Object.entries(object)) {
      typeAssertImpl(`${path}.${key}`, value, assertion.valueAssertion, preventErr)
    }
  } else if (object === undefined) {
    typeAssertError(path, 'unexpected "undefined" value', preventErr)
  } else if (object === null) {
    typeAssertError(path, 'unexpected "null" value', preventErr)
  } else if (assertion.constructor === Array.prototype.constructor) {
    assertTypeEqImpl2(path, Array.prototype.constructor, object.constructor, TypeStrings.Array)
    if (assertion.length === 0) {
      // fallthrough
    } else if (assertion.length === 1) {
      for (const [idx, element] of Object.entries(object)) {
        typeAssertImpl(`${path}[${idx}]`, element, assertion[0], preventErr)
      }
    } else {
      typeAssertError(path, '"array" type assertion should only have one element', preventErr)
    }
  } else if (assertionType === TypeStrings.Object
             && assertion.constructor === Object.prototype.constructor) {
    for (const [field, fieldAssertion] of Object.entries(assertion)) {
      typeAssertImpl(`${path}.${field}`, object[field], fieldAssertion, preventErr)
    }
  } else {
    typeAssertError(path, 'invalid assertion', preventErr)
  }
}

export const typeAssert = (object, assertion) => typeAssertImpl('object', object, assertion, false)

export const NullableType = (function () {
  function NullableType(origin) {
    this.origin = origin
  }

  return NullableType
}())

export const SumType = (function () {
  function SumType(types) {
    this.types = types
  }

  return SumType
}())

export const ChainType = (function () {
  function ChainType(types) {
    this.types = types
  }

  return ChainType
}())

export const ValueAssertion = (function() {
  function ValueAssertion(value) {
    this.value = value
  }

  return ValueAssertion
}())

export const ObjectValueAssertion = (function() {
  function ObjectValueAssertion(valueAssertion) {
    this.valueAssertion = valueAssertion
  }

  return ObjectValueAssertion
}())

export const enableChainAPI = methodNames => {
  let orNullName = 'orNull'
  let sumWithName = 'sumWith'
  let chainWithName = 'chainWith'
  let assertValueName = 'assertValue'
  let assertObjectValueName = 'assertObjectValue'

  if (methodNames) {
    const { orNull, sumWith, chainWith, assertValue, assertObjectValue } = methodNames
    orNullName = orNull || orNullName
    sumWithName = sumWith || sumWithName
    chainWithName = chainWith || chainWithName
    assertValueName = assertValue || assertValueName
    assertObjectValueName = assertObjectValue || assertObjectValueName
  }

  const checkChainNotEndedByValueAssertion = types => {
    if (types[types.length - 1].constructor === ValueAssertion.prototype.constructor) {
      typeAssertError('<onbuild> ChainType.prototype.orNull', `should append any assertion after ${assertValueName}`)
    }
  }

  Object.defineProperty(Object.prototype, orNullName, {
    enumerable: false,
    configurable: false,
    writable: false,
    value() {
      if (this.constructor === NullableType.prototype.constructor) {
        typeAssertError('<onbuild> Object.prototype.orNull', 'trying to nest nullable modification')
      }
      return new NullableType(this)
    }
  })

  Object.defineProperty(String.prototype, orNullName, {
    enumerable: false,
    configurable: false,
    writable: false,
    value() {
      if (`${this}` === TypeStrings.Undefined) {
        typeAssertError('<onbuild> String.prototype.orNull', '"undefined" type cannot be nullable')
      } else if (`${this}`.endsWith('?')) {
        typeAssertError('<onbuild> String.prototype.orNull', 'trying to nest nullable modification')
      }
      return `${this}?`
    }
  })

  Object.defineProperty(SumType.prototype, sumWithName, {
    enumerable: false,
    configurable: false,
    writable: false,
    value(that) {
      if (that.constructor === SumType.prototype.constructor) {
        return new SumType([...this.types, ...that.types])
      } else {
        return new SumType([...this.types, that])
      }
    }
  })

  Object.defineProperty(Object.prototype, sumWithName, {
    enumerable: false,
    configurable: false,
    writable: false,
    value(that) {
      return (new SumType([this]))[sumWithName](that)
    }
  })

  Object.defineProperty(String.prototype, sumWithName, {
    enumerable: false,
    configurable: false,
    writable: false,
    value(that) {
      return (new SumType([`${this}`]))[sumWithName](that)
    }
  })

  Object.defineProperty(ChainType.prototype, chainWithName, {
    enumerable: false,
    configurable: false,
    writable: false,
    value(that) {
      checkChainNotEndedByValueAssertion(this.types)

      if (that.constructor === ChainType.prototype.constructor) {
        return new ChainType([...this.types, ...that.types])
      } else {
        return new ChainType([...this.types, that])
      }
    }
  })

  Object.defineProperty(Object.prototype, chainWithName, {
    enumerable: false,
    configurable: false,
    writable: false,
    value(that) {
      let self = this
      let nullable = false
      if (self.constructor === NullableType.prototype.constructor) {
        nullable = true
        self = self.origin
        return new NullableType(self[chainWithName](that))
      }
      return (new ChainType([self]))[chainWithName](that)
    }
  })

  Object.defineProperty(String.prototype, chainWithName, {
    enumerable: false,
    configurable: false,
    writable: false,
    value(that) {
      let nullable = false
      let self = `${this}`
      if (self.endsWith('?')) {
        nullable = true
        self = self.slice(0, -1)
      }

      let ret = (new ChainType([self]))[chainWithName](that)
      if (nullable) {
        ret = new NullableType(ret)
      }
      return ret
    }
  })

  Object.defineProperty(Object.prototype, assertValueName, {
    enumerable: false,
    configurable: false,
    writable: false,
    value(that) {
      return new ChainType([this, new ValueAssertion(that)])
    }
  })

  Object.defineProperty(ChainType.prototype, assertValueName, {
    enumerable: false,
    configurable: false,
    writable: false,
    value(that) {
      checkChainNotEndedByValueAssertion(this.types)
      return new ChainType([...this.types, new ValueAssertion(that)])
    }
  })

  Object.defineProperty(Object.prototype, assertObjectValueName, {
    enumerable: false,
    configurable: false,
    writable: false,
    value(valueAssertion) {
      if (this.constructor !== Object.prototype.constructor) {
        typeAssertError(
            '<onbuild> Object.prototype.assertObjectValue',
            `cannot assert object values of "${this.constructor.name}"`
        )
      }
      return new ObjectValueAssertion(valueAssertion)
    }
  })

  Object.defineProperty(String.prototype, assertObjectValueName, {
    enumerable: false,
    configurable: false,
    writable: false,
    value(valueAssertion) {
      let nullable = false
      let self = `${this}`
      if (self.endsWith('?')) {
        nullable = true
        self = self.slice(0, -1)
      }

      if (self !== 'object') {
        typeAssertError(
            '<onbuild> String.prototype.assertObjectValue',
            `cannot assert object values of "${self}"`
        )
      }

      let ret = new ObjectValueAssertion(valueAssertion)
      if (nullable) {
        ret = new NullableType(ret)
      }
      return ret
    }
  })
}
