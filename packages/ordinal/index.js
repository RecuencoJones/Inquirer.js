const { createPrompt } = require('@inquirer/core');
const { isUpKey, isDownKey, isSpaceKey, isNumberKey } = require('@inquirer/core/lib/key');
const Paginator = require('@inquirer/core/lib/Paginator');
const chalk = require('chalk');
const figures = require('figures');
const { cursorHide } = require('ansi-escapes');

function updateSelectedValues(values, newValue) {
  if (values.includes(newValue)) {
    return values.filter(v => v !== newValue);
  }

  return [...values, newValue];
}

module.exports = createPrompt(
  readline => ({
    onKeypress: (value, key, { cursorPosition = 0, choices, values = [] }, setState) => {
      let newCursorPosition = cursorPosition;
      if (isUpKey(key) || isDownKey(key)) {
        const offset = isUpKey(key) ? -1 : 1;
        let selectedOption;

        while (!selectedOption || selectedOption.disabled) {
          newCursorPosition =
            (newCursorPosition + offset + choices.length) % choices.length;
          selectedOption = choices[newCursorPosition];
        }

        setState({ cursorPosition: newCursorPosition });
      } else if (isSpaceKey(key)) {
        setState({
          showHelpTip: false,
          values: updateSelectedValues(values, choices[cursorPosition].value)
        });
      } else if (key.name === 'r') {
        setState({
          values: []
        });
      } else if (isNumberKey(key)) {
        // Adjust index to start at 1
        const position = Number(key.name) - 1;

        // Abort if the choice doesn't exists or if disabled
        if (!choices[position] || choices[position].disabled) {
          return;
        }

        setState({
          cursorPosition: position,
          values: updateSelectedValues(values, choices[position].value)
        });
      }
    },
    mapStateToValue: ({ values }) => values,
    paginator: new Paginator(readline)
  }),
  (state, { paginator }) => {
    const {
      prefix,
      choices,
      values = [],
      showHelpTip,
      cursorPosition = 0,
      pageSize = 7
    } = state;
    const message = chalk.bold(state.message);

    if (state.status === 'done') {
      return `${prefix} ${message} ${chalk.cyan(values.join(', '))}`;
    }

    let helpTip = '';
    if (showHelpTip !== false) {
      const keys = [
        `${chalk.cyan.bold('<space>')} to select`,
        `${chalk.cyan.bold('<r>')} to reset`
      ];
      helpTip = ` (Press ${keys.join(', ')})`;
    }

    const allChoices = choices
      .map(({ name, value, disabled }, index) => {
        const line = name || value;
        if (disabled) {
          return chalk.dim(` - ${line} (disabled)`);
        }

        const selectedIndex = values.indexOf(value);

        const ordinal =
          selectedIndex >= 0 ? chalk.green(selectedIndex + 1) : figures.circle;

        if (index === cursorPosition) {
          return chalk.cyan(`${figures.pointer}${ordinal} ${line}`);
        }

        return ` ${ordinal} ${line}`;
      })
      .join('\n');
    const windowedChoices = paginator.paginate(allChoices, cursorPosition, pageSize);
    return `${prefix} ${message}${helpTip}\n${windowedChoices}${cursorHide}`;
  }
);
