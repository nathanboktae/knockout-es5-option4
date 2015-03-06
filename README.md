## Vanilla Javascript powered by Knockout

[![Build Status](https://secure.travis-ci.org/nathanboktae/knockout-es5-option4.png)](http://travis-ci.org/nathanboktae/knockout-es5-option4)

[Knockout.js](http://knockoutjs.com) is a MV* (MVVM) framework with powerful two-way data-binding and [pub-sub mechanisms](http://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern). However to use it, code feels akward:

```javascript
var model = {
	firstName: ko.observable('John'),
	lastName: ko.observable('Doe'),
	age: ko.observable(30)
};

model.firstName('Jane');
model.age(model.age() + 1);
```

wouldn't it be nice to just use

```javascript
model.firstName = 'Jane';
model.age++;
```

knockout-es5-option4 solves this with ECMAScript 5 Properties, so you can do just that!

```javascript
var model = ko.observe({
	firstName: 'Bob',
	lastName: 'Doe',
	cars: [{
		make: 'Ford',
		model: 'F150'
	}, {
		make: 'BMW',
		model: '328i'
	}]
})

ko.defineComputedProperty(model, 'ownershipSummary', function() {
	return this.firstName + ' ' + this.lastName + ' owns: ' + this.cars.map(function(c) {
	    return c.make + ' ' + c.model
	}).join(', ');
})

model.ownershipSummary
// => Bob Doe owns: Ford F150, BMW 328i

model.firstName = 'Jon';
model.ownershipSummary
// => Jon Doe owns: Ford F150, BMW 328i

model.cars[0].model = 'Mustang';
model.ownershipSummary
// => Jon Doe owns: Ford Mustang, BMW 328i
```

If you need to access the underlying observable, they are available as non-enumerable properties with a proceeding underscore.

```javascript
var model = ko.observe({
	name: 'Bob'
})

model._name.subscribe(function(newName) {
	console.log('Hi ' + newName)
})
```

### Usage

#### ko.observe(object, defaults, options)

- `object`: The object to add properties wrapping knockout observables. This is also the return value
- `defaults` (optional): A set of default values for those properties. This allows you to essentially clone an object without modifying it with the observable properties. Defaults to the `object` parameter.
- `options` (optional):  See options.

#### ko.observableObject(defaults, options)

A thin wrapper around `observe` that returns a new object. Literally it is:

```javascript
ko.observableObject = function(defaults, options) {
    return ko.observe({}, defaults, options)
}
```

#### ko.defineObservableProperty(object, propertyName, default, options)
- `object`: the object to add the property to.
- `propertyName`: the name of the property. It will delete any existing properties that don't have property descriptors.
- `default`: the value the observable should be initialized to.
- `options`: See options.

#### ko.defineComputedProperty(object, propertyName, definition, options)
- `object`: the object to add the property to.
- `propertyName`: the name of the property. It will delete any existing properties that don't have property descriptors.
- `definition`: the definition of the computed that will be passed to `ko.computed`.
- `options`: See [options][#options].

#### Options

- `deep`: Deeply observe the object or array. Defaults to true.
- `arrayMapping`: Specify a way to map items in an array that are the same, so that an array doesn't have to be in order for items to match up. For example:

```javascript
var person = ko.observe({
    id: 1,
    name: 'Jane',
    cars: [{
        id: 1,
        make: 'BMW',
        model: '3-series'
    }, {
        id: 2,
        make: 'Toyota',
        model: 'Tundra'
    }]
})

// Update our model to have a year on the cars. Match cars based on the 'id' property.
ko.observe(person, {
    cars: [{
        id: 2,
        year: 2015
    }, {
        id: 3,
        make: 'Tesla'
        model: 'Model S',
        year: 2014
    }]
}, {
    arrayMapping: {
        cars: 'id'
    }
})

person.should.deep.equal({
    id: 1,
    name: 'Jane',
    cars: [{
        id: 1,
        make: 'BMW',
        model: '3-series'
    }, {
        id: 2,
        make: 'Toyota',
        model: 'Tundra',
        year: 2015
    }, {
        id: 3,
        make: 'Tesla'
        model: 'Model S',
        year: 2014
    }]
})
```

### Compared to knockout-es5

- **Does not depend on [WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) for easier compatibility**. However, simply deleting an property does not release it from memory. You must also delete the underscore prefixed property too. I found in my usage I never ended up deleting indivdual properties, but just whole objects, so this has not been an issue.
- **No referrence needed to knockout to access the observable**. When using AMDs and in view code, having the observable directly on the object has been a nice convenience.
- **Deeply observes objects**. Currently knockout-es5 9does not support deep tracking]().

### Why "Option 4"?

In 2012, trying to find a solution to wrap knockout observables in ES5 properties, I found [this gist by Domenic Denicola](https://gist.github.com/domenic/1793211) of his brainstormings about potential options, before Steve Sanderson created [knockout-es5](). So I decided to go with his Solution #4, to expose the observables on the object with a proceeding underscore in front of them. However I did this while working at Microsoft, and it did not get released as open source until Janurary 2015.
