(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['typeAssert'], factory)
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory()
    } else {
        root.typeAssert = factory()
    }
}(typeof self !== 'undefined' ? self : this, function () {
    const TypeStrings = {
        String: typeof '',
        Symbol: typeof Symbol(''),
        Number: typeof 0,
        Object: typeof {},
        Boolean: typeof true,
        Function: typeof (() => { }),
        Undefined: typeof undefined,

        Array: Array.prototype.constructor.name,
        Date: Date.prototype.constructor.name,
        RegExp: RegExp.prototype.constructor.name
    }

    const removeTail = (srcText) => {
        const tail = srcText.slice(-1);
        if (tail === '?') {
            return [srcText.slice(0, -1), true]
        }
        return [srcText, false]
    }

    const typeAssertError = (path, message) => {
        throw `Type assertion failed: "${path}": ${message}`
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
        let ret = `sum type check failure:\n`
        for (const [idx, error] of Object.entries(errors)) {
            ret = `${ret}  - branch ${idx} faild for: { ${error} }\n`
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
        } else if (object === undefined) {
            typeAssertError(path, 'unexpected "undefined" value')
        } else if (object === null) {
            typeAssertError(path, 'unexpected "null" value')
        } else if (assertion.constructor === Array.prototype.constructor) {
            assertTypeEqImpl2(path, Array.prototype.constructor, object.constructor, TypeStrings.Array)
            if (assertion.length === 0) {
            } else if (assertion.length === 1) {
                for (const [idx, element] of Object.entries(object)) {
                    typeAssertImpl(`${path}[${idx}]`, element, assertion[0])
                }
            } else {
                typeAssertError(path, '"array" type assertion should only have one element')
            }
        } else if (assertionType === TypeStrings.Object && assertion.constructor === Object.prototype.constructor) {
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

    Object.prototype.orNull = function () {
        if (this.constructor === NullableType.prototype.constructor) {
            typeAssertError('<onbuild> Object.prototype.orNull', 'trying to nest nullable modification')
        }
        return new NullableType(this)
    }

    String.prototype.orNull = function () {
        if (`${this}` === TypeStrings.Undefined) {
            typeAssertError('<onbuild> String.prototype.orNull', '"undefined" type cannot be nullable')
        } else if (`${this}`.endsWith('?')) {
            typeAssertError('<onbuild> String.prototype.orNull', 'trying to nest nullable modification')
        }
        return `${this}?`
    }

    const SumType = (function () {
        function SumType(types) {
            this.types = types
        }
        return SumType
    }())

    SumType.prototype.sumWith = function (that) {
        if (that.constructor === SumType.prototype.constructor) {
            this.types = this.types.concat(that.types)
        } else {
            this.types.push(that)
        }
        return this
    }

    Object.prototype.sumWith = function (that) {
        return (new SumType([this])).sumWith(that)
    }

    String.prototype.sumWith = function (that) {
        return (new SumType([`${this}`])).sumWith(that)
    }

    return {
        TypeStrings, typeAssert, SumType
    }
}))
