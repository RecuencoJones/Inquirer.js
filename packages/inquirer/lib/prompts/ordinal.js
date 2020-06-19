'use strict';
/**
 * `list` type prompt
 */

var _ = {
  isArray: require('lodash/isArray'),
  map: require('lodash/map'),
  isString: require('lodash/isString')
};
var chalk = require('chalk');
var cliCursor = require('cli-cursor');
var figures = require('figures');
var { map, takeUntil } = require('rxjs/operators');
var Base = require('./base');
var observe = require('../utils/events');
var Paginator = require('../utils/paginator');

class OrdinalPrompt extends Base {
  constructor(questions, rl, answers) {
    super(questions, rl, answers);

    this.values = [];

    if (!this.opt.choices) {
      this.throwParamError('choices');
    }

    if (_.isArray(this.opt.default)) {
      this.values = this.opt.default.reduce(
        function(accum, value) {
          if (this.opt.choices.find({ value: value })) {
            return updateSelectedValues(accum, value);
          }

          return accum;
        }.bind(this),
        []
      );
    }

    this.pointer = 0;

    // Make sure no default is set (so it won't be printed)
    this.opt.default = null;

    this.paginator = new Paginator(this.screen);
  }

  /**
   * Start the Inquiry session
   * @param  {Function} cb      Callback when prompt is done
   * @return {this}
   */

  _run(cb) {
    this.done = cb;

    var events = observe(this.rl);

    var validation = this.handleSubmitEvents(
      events.line.pipe(map(this.getCurrentValue.bind(this)))
    );
    validation.success.forEach(this.onEnd.bind(this));
    validation.error.forEach(this.onError.bind(this));

    events.normalizedUpKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onUpKey.bind(this));
    events.normalizedDownKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onDownKey.bind(this));
    events.numberKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onNumberKey.bind(this));
    events.spaceKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onSpaceKey.bind(this));
    events.rKey.pipe(takeUntil(validation.success)).forEach(this.onResetKey.bind(this));

    // Init the prompt
    cliCursor.hide();
    this.render();
    this.firstRender = false;

    return this;
  }

  /**
   * Render the prompt to screen
   * @return {OrdinalPrompt} self
   */

  render(error) {
    // Render question
    var message = this.getQuestion();
    var bottomContent = '';

    if (!this.spaceKeyPressed) {
      message +=
        '(Press ' +
        chalk.cyan.bold('<space>') +
        ' to select, ' +
        chalk.cyan.bold('<r>') +
        ' to reset)';
    }

    // Render choices or answer depending on the state
    if (this.status === 'answered') {
      message += chalk.cyan(this.selection.join(', '));
    } else {
      var choicesStr = renderChoices(this.opt.choices, this.values, this.pointer);
      var indexPosition = this.opt.choices.indexOf(
        this.opt.choices.getChoice(this.pointer)
      );
      message +=
        '\n' + this.paginator.paginate(choicesStr, indexPosition, this.opt.pageSize);
    }

    if (error) {
      bottomContent = chalk.red('>> ') + error;
    }

    this.screen.render(message, bottomContent);
  }

  /**
   * When user press `enter` key
   */

  onEnd(state) {
    this.status = 'answered';
    this.spaceKeyPressed = true;
    // Rerender prompt (and clean subline error)
    this.render();

    this.screen.done();
    cliCursor.show();
    this.done(state.value);
  }

  onError(state) {
    this.render(state.isValid);
  }

  getCurrentValue() {
    var choices = this.values.filter(function(value) {
      var choice = this.opt.choices.find({ value: value });

      return choice && !choice.disabled;
    }, this);

    this.selection = choices;
    return choices;
  }

  onUpKey() {
    var len = this.opt.choices.realLength;
    this.pointer = this.pointer > 0 ? this.pointer - 1 : len - 1;
    this.render();
  }

  onDownKey() {
    var len = this.opt.choices.realLength;
    this.pointer = this.pointer < len - 1 ? this.pointer + 1 : 0;
    this.render();
  }

  onNumberKey(input) {
    if (input <= this.opt.choices.realLength) {
      this.pointer = input - 1;
      this.toggleChoice(this.pointer);
    }

    this.render();
  }

  onSpaceKey() {
    this.spaceKeyPressed = true;
    this.toggleChoice(this.pointer);
    this.render();
  }

  onResetKey() {
    this.values = [];

    this.render();
  }

  toggleChoice(index) {
    var item = this.opt.choices.getChoice(index);

    if (item !== undefined) {
      this.values = updateSelectedValues(this.values, item.value);
    }
  }
}

/**
 * Function for rendering ordinal choices
 * @param  {Number} pointer  Position of the pointer
 * @param  {String[]} values Ordered list of selected values
 * @return {String}          Rendered content
 */

function renderChoices(choices, values, pointer) {
  var output = '';
  var separatorOffset = 0;

  choices.forEach(function(choice, i) {
    if (choice.type === 'separator') {
      separatorOffset++;
      output += ' ' + choice + '\n';
      return;
    }

    if (choice.disabled) {
      separatorOffset++;
      output += ' - ' + choice.name;
      output += ' (' + (_.isString(choice.disabled) ? choice.disabled : 'Disabled') + ')';
    } else {
      var line = getItemIndexOrBox(values.indexOf(choice.value)) + ' ' + choice.name;
      if (i - separatorOffset === pointer) {
        output += chalk.cyan(figures.pointer + line);
      } else {
        output += ' ' + line;
      }
    }

    output += '\n';
  });

  return output.replace(/\n$/, '');
}

/**
 * Get the index
 * @param  {Number} index - add ordinal or not to the checkbox
 * @return {String} Composited checkbox string
 */

function getItemIndexOrBox(index) {
  return index >= 0 ? chalk.green(index + 1) : figures.radioOff;
}

/**
 * Update selected choices
 * @param {string[]} values - ordered list of selected choices
 * @param {string} newValue - choice to toggle
 * @return {string[]} Ordered list of selected choices
 */
function updateSelectedValues(values, newValue) {
  if (values.includes(newValue)) {
    return values.filter(v => v !== newValue);
  }

  return [...values, newValue];
}

module.exports = OrdinalPrompt;
