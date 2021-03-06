var expect = require('chai').expect;
var _ = require('lodash');
var ReadlineStub = require('../../helpers/readline');
var fixtures = require('../../helpers/fixtures');

var Ordinal = require('../../../lib/prompts/ordinal');

describe('`ordinal` prompt', function() {
  beforeEach(function() {
    this.fixture = _.clone(fixtures.ordinal);
    this.rl = new ReadlineStub();
    this.ordinal = new Ordinal(this.fixture, this.rl);
  });

  it('should return a single selected choice in an array', function(done) {
    this.ordinal.run().then(answer => {
      expect(answer).to.be.an('array');
      expect(answer.length).to.equal(1);
      expect(answer[0]).to.equal('choice 1');
      done();
    });
    this.rl.input.emit('keypress', ' ', { name: 'space' });
    this.rl.emit('line');
  });

  it('should return multiples selected choices in an array', function(done) {
    this.ordinal.run().then(answer => {
      expect(answer).to.be.an('array');
      expect(answer.length).to.equal(2);
      expect(answer[0]).to.equal('choice 2');
      expect(answer[1]).to.equal('choice 1');
      done();
    });
    this.rl.input.emit('keypress', null, { name: 'down' });
    this.rl.input.emit('keypress', ' ', { name: 'space' });
    this.rl.input.emit('keypress', null, { name: 'up' });
    this.rl.input.emit('keypress', ' ', { name: 'space' });
    this.rl.emit('line');
  });

  it('should check defaults choices', function(done) {
    this.fixture.default = ['1'];
    this.fixture.choices = [{ name: '1' }, { name: '2' }, { name: '3' }];
    this.ordinal = new Ordinal(this.fixture, this.rl);
    this.ordinal.run().then(answer => {
      expect(answer.length).to.equal(1);
      expect(answer[0]).to.equal('1');
      done();
    });
    this.rl.emit('line');
  });

  it('provide an array of checked choice to validate', function() {
    this.fixture.default = ['1', '2'];
    this.fixture.choices = [{ name: '1' }, { name: '2' }, { name: '3' }];
    this.fixture.validate = function(answer) {
      expect(answer).to.eql(['1', '2']);
      return true;
    };

    this.ordinal = new Ordinal(this.fixture, this.rl);
    var promise = this.ordinal.run();
    this.rl.emit('line');
    return promise;
  });

  it('should check defaults choices if given as array of values', function(done) {
    this.fixture.choices = [{ name: '1' }, { name: '2' }, { name: '3' }];
    this.fixture.default = ['1', '3'];
    this.ordinal = new Ordinal(this.fixture, this.rl);
    this.ordinal.run().then(answer => {
      expect(answer.length).to.equal(2);
      expect(answer[0]).to.equal('1');
      expect(answer[1]).to.equal('3');
      done();
    });
    this.rl.emit('line');
  });

  it('should toggle choice when hitting space', function(done) {
    this.ordinal.run().then(answer => {
      expect(answer.length).to.equal(1);
      expect(answer[0]).to.equal('choice 1');
      done();
    });
    this.rl.input.emit('keypress', ' ', { name: 'space' });
    this.rl.input.emit('keypress', null, { name: 'down' });
    this.rl.input.emit('keypress', ' ', { name: 'space' });
    this.rl.input.emit('keypress', ' ', { name: 'space' });
    this.rl.emit('line');
  });

  it('should allow for arrow navigation', function(done) {
    this.ordinal.run().then(answer => {
      expect(answer.length).to.equal(1);
      expect(answer[0]).to.equal('choice 2');
      done();
    });

    this.rl.input.emit('keypress', null, { name: 'down' });
    this.rl.input.emit('keypress', null, { name: 'down' });
    this.rl.input.emit('keypress', null, { name: 'up' });

    this.rl.input.emit('keypress', ' ', { name: 'space' });
    this.rl.emit('line');
  });

  it('should allow for vi-style navigation', function(done) {
    this.ordinal.run().then(answer => {
      expect(answer.length).to.equal(1);
      expect(answer[0]).to.equal('choice 2');
      done();
    });

    this.rl.input.emit('keypress', 'j', { name: 'j' });
    this.rl.input.emit('keypress', 'j', { name: 'j' });
    this.rl.input.emit('keypress', 'k', { name: 'k' });

    this.rl.input.emit('keypress', ' ', { name: 'space' });
    this.rl.emit('line');
  });

  it('should allow for emacs-style navigation', function(done) {
    this.ordinal.run().then(answer => {
      expect(answer.length).to.equal(1);
      expect(answer[0]).to.equal('choice 2');
      done();
    });

    this.rl.input.emit('keypress', 'n', { name: 'n', ctrl: true });
    this.rl.input.emit('keypress', 'n', { name: 'n', ctrl: true });
    this.rl.input.emit('keypress', 'p', { name: 'p', ctrl: true });

    this.rl.input.emit('keypress', ' ', { name: 'space' });
    this.rl.emit('line');
  });

  it('should allow 1-9 shortcut key', function(done) {
    this.ordinal.run().then(answer => {
      expect(answer.length).to.equal(1);
      expect(answer[0]).to.equal('choice 2');
      done();
    });

    this.rl.input.emit('keypress', '2');
    this.rl.emit('line');
  });

  it('should select no answers if <r> is pressed', function() {
    var promise = this.ordinal.run();

    this.rl.input.emit('keypress', 'a', { name: 'r' });
    this.rl.emit('line');

    return promise.then(answer => {
      expect(answer.length).to.equal(0);
    });
  });

  describe('with disabled choices', function() {
    beforeEach(function() {
      this.fixture.choices.push({
        name: 'dis1',
        disabled: true
      });
      this.fixture.choices.push({
        name: 'dis2',
        disabled: 'uh oh'
      });
      this.ordinal = new Ordinal(this.fixture, this.rl);
    });

    it('output disabled choices and custom messages', function() {
      var promise = this.ordinal.run();
      this.rl.emit('line');
      return promise.then(() => {
        expect(this.rl.output.__raw__).to.contain('- dis1 (Disabled)');
        expect(this.rl.output.__raw__).to.contain('- dis2 (uh oh)');
      });
    });

    it('skip disabled choices', function(done) {
      this.ordinal.run().then(answer => {
        expect(answer[0]).to.equal('choice 1');
        done();
      });
      this.rl.input.emit('keypress', null, { name: 'down' });
      this.rl.input.emit('keypress', null, { name: 'down' });
      this.rl.input.emit('keypress', null, { name: 'down' });

      this.rl.input.emit('keypress', ' ', { name: 'space' });
      this.rl.emit('line');
    });

    it("uncheck defaults choices who're disabled", function(done) {
      this.fixture.default = ['1'];
      this.fixture.choices = [{ name: '1', disabled: true }, { name: '2' }];
      this.ordinal = new Ordinal(this.fixture, this.rl);
      this.ordinal.run().then(answer => {
        expect(answer.length).to.equal(0);
        done();
      });
      this.rl.emit('line');
    });

    it('disabled can be a function', function() {
      this.fixture.choices = [
        {
          name: 'dis1',
          disabled: function(answers) {
            expect(answers.foo).to.equal('foo');
            return true;
          }
        }
      ];
      this.ordinal = new Ordinal(this.fixture, this.rl, { foo: 'foo' });
      var promise = this.ordinal.run();
      this.rl.emit('line');

      promise.then(() => {
        expect(this.rl.output.__raw__).to.contain('- dis1 (Disabled)');
      });
    });
  });
});
