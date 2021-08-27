'use strict'

const TypeStrings = {
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

const typeAssertError = (path, message) => {
  const errMsg = `Type assertion failed: "${path}": ${message}`
  console.trace(errMsg)
  throw errMsg
}

const assertTypeEqImpl = (path, expected, got) => {
  if (expected !== got) {
    typeAssertError(path, `expected type "${expected}", got "${got}"`)
  }
}

const assertTypeEqImpl2 = (path, expectedCtor, gotCtor, expected) => {
  if (expectedCtor !== gotCtor) {
    typeAssertError(
      path,
      `expected type "${expected}", checking using ctor "${expectedCtor.name}", got "${gotCtor.name}"`
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

const typeAssertImpl = (path, object, assertion) => {
  const assertionType = typeof assertion
  if (assertion === null) {
    if (object !== null) {
      typeAssertError(path, `expected "null" value, got "${typeof object}"`)
    }
  } else if (assertionType === TypeStrings.String) {
    const [type, nullable] = removeTail(assertion)
    if (nullable) {
      if (type === TypeStrings.Undefined) {
        typeAssertError(path, '"undefined" type cannot be nullable')
      }
      if (object === null) {
        return
      }
    }
    if (object === null) {
      typeAssertError(path, 'unexpected "null" value')
    }

    if (object !== undefined) {
      switch (type) {
        case TypeStrings.Array:
          assertTypeEqImpl2(path, Array.prototype.constructor, object.constructor, type)
          return
        case TypeStrings.Date:
          assertTypeEqImpl2(path, Date.prototype.constructor, object.constructor, type)
          return
        case TypeStrings.RegExp:
          assertTypeEqImpl2(path, RegExp.prototype.constructor, object.constructor, type)
          return
        default:
          // fall through
      }
    }

    assertTypeEqImpl(path, type, typeof object)
  } else if (assertionType === TypeStrings.Function) {
    const assertResult = assertion(object)
    if (assertResult !== true) {
      typeAssertError(path, assertResult)
    }
  } else if (assertion.constructor === NullableType.prototype.constructor) {
    if (object === null) {
      return
    }
    typeAssertImpl(path, object, assertion.origin)
  } else if (assertion.constructor === SumType.prototype.constructor) {
    const failures = []
    for (const type of assertion.types) {
      try {
        typeAssertImpl(path, object, type)
      } catch (error) {
        failures.push(error)
        continue
      }
      return
    }
    typeAssertError(path, formatSumTypeError(failures))
  } else if (assertion.constructor === ChainType.prototype.constructor) {
    // eslint-disable-next-line guard-for-in
    for (const partIdx in assertion.types) {
      typeAssertImpl(`${path}:<${partIdx}>`, object, assertion.types[partIdx])
    }
  } else if (object === undefined) {
    typeAssertError(path, 'unexpected "undefined" value')
  } else if (object === null) {
    typeAssertError(path, 'unexpected "null" value')
  } else if (assertion.constructor === Array.prototype.constructor) {
    assertTypeEqImpl2(path, Array.prototype.constructor, object.constructor, TypeStrings.Array)
    if (assertion.length === 0) {
      // fallthrough
    } else if (assertion.length === 1) {
      for (const [idx, element] of Object.entries(object)) {
        typeAssertImpl(`${path}[${idx}]`, element, assertion[0])
      }
    } else {
      typeAssertError(path, '"array" type assertion should only have one element')
    }
  } else if (assertionType === TypeStrings.Object
             && assertion.constructor === Object.prototype.constructor) {
    for (const [field, fieldAssertion] of Object.entries(assertion)) {
      typeAssertImpl(`${path}.${field}`, object[field], fieldAssertion)
    }
  } else {
    typeAssertError(path, 'invalid assertion')
  }
}

const typeAssert = (object, assertion) => typeAssertImpl('object', object, assertion)

const NullableType = (function () {
  function NullableType(origin) {
    this.origin = origin
  }

  return NullableType
}())

Object.defineProperty(Object.prototype, 'orNull', {
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

Object.defineProperty(String.prototype, 'orNull', {
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

const SumType = (function () {
  function SumType(types) {
    this.types = types
  }

  return SumType
}())

Object.defineProperty(SumType.prototype, 'sumWith', {
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

Object.defineProperty(Object.prototype, 'sumWith', {
  enumerable: false,
  configurable: false,
  writable: false,
  value(that) {
    return (new SumType([this])).sumWith(that)
  }
})

Object.defineProperty(String.prototype, 'sumWith', {
  enumerable: false,
  configurable: false,
  writable: false,
  value(that) {
    return (new SumType([`${this}`])).sumWith(that)
  }
})

const ChainType = (function () {
  function ChainType(types) {
    this.types = types
  }

  return ChainType
}())

Object.defineProperty(ChainType.prototype, 'chainWith', {
  enumerable: false,
  configurable: false,
  writable: false,
  value(that) {
    if (that.constructor === ChainType.prototype.constructor) {
      return new ChainType([...this.types, ...that.types])
    } else {
      return new ChainType([...this.types, that])
    }
  }
})

Object.defineProperty(Object.prototype, 'chainWith', {
  enumerable: false,
  configurable: false,
  writable: false,
  value(that) {
    return (new ChainType([this])).chainWith(that)
  }
})

module.exports = {
  TypeStrings,
  typeAssert,
  NullableType,
  SumType,
  ChainType
}
