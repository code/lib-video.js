/**
 * @file text-track-settings.js
 */
import window from 'global/window';
import Component from '../component';
import ModalDialog from '../modal-dialog';
import {createEl} from '../utils/dom';
import * as Obj from '../utils/obj';
import log from '../utils/log';
import TextTrackSettingsColors from './text-track-settings-colors';
import TextTrackSettingsFont from './text-track-settings-font';
import TrackSettingsControls from './text-track-settings-controls';

/** @import Player from '../player' */

const LOCAL_STORAGE_KEY = 'vjs-text-track-settings';

const COLOR_BLACK = ['#000', 'Black'];
const COLOR_BLUE = ['#00F', 'Blue'];
const COLOR_CYAN = ['#0FF', 'Cyan'];
const COLOR_GREEN = ['#0F0', 'Green'];
const COLOR_MAGENTA = ['#F0F', 'Magenta'];
const COLOR_RED = ['#F00', 'Red'];
const COLOR_WHITE = ['#FFF', 'White'];
const COLOR_YELLOW = ['#FF0', 'Yellow'];

const OPACITY_OPAQUE = ['1', 'Opaque'];
const OPACITY_SEMI = ['0.5', 'Semi-Transparent'];
const OPACITY_TRANS = ['0', 'Transparent'];

// Configuration for the various <select> elements in the DOM of this component.
//
// Possible keys include:
//
// `default`:
//   The default option index. Only needs to be provided if not zero.
// `parser`:
//   A function which is used to parse the value from the selected option in
//   a customized way.
// `selector`:
//   The selector used to find the associated <select> element.
const selectConfigs = {
  backgroundColor: {
    selector: '.vjs-bg-color > select',
    id: 'captions-background-color-%s',
    label: 'Color',
    options: [
      COLOR_BLACK,
      COLOR_WHITE,
      COLOR_RED,
      COLOR_GREEN,
      COLOR_BLUE,
      COLOR_YELLOW,
      COLOR_MAGENTA,
      COLOR_CYAN
    ],
    className: 'vjs-bg-color'
  },

  backgroundOpacity: {
    selector: '.vjs-bg-opacity > select',
    id: 'captions-background-opacity-%s',
    label: 'Opacity',
    options: [
      OPACITY_OPAQUE,
      OPACITY_SEMI,
      OPACITY_TRANS
    ],
    className: 'vjs-bg-opacity vjs-opacity'
  },

  color: {
    selector: '.vjs-text-color > select',
    id: 'captions-foreground-color-%s',
    label: 'Color',
    options: [
      COLOR_WHITE,
      COLOR_BLACK,
      COLOR_RED,
      COLOR_GREEN,
      COLOR_BLUE,
      COLOR_YELLOW,
      COLOR_MAGENTA,
      COLOR_CYAN
    ],
    className: 'vjs-text-color'
  },

  edgeStyle: {
    selector: '.vjs-edge-style > select',
    id: '',
    label: 'Text Edge Style',
    options: [
      ['none', 'None'],
      ['raised', 'Raised'],
      ['depressed', 'Depressed'],
      ['uniform', 'Uniform'],
      ['dropshadow', 'Drop shadow']
    ]
  },

  fontFamily: {
    selector: '.vjs-font-family > select',
    id: '',
    label: 'Font Family',
    options: [
      ['proportionalSansSerif', 'Proportional Sans-Serif'],
      ['monospaceSansSerif', 'Monospace Sans-Serif'],
      ['proportionalSerif', 'Proportional Serif'],
      ['monospaceSerif', 'Monospace Serif'],
      ['casual', 'Casual'],
      ['script', 'Script'],
      ['small-caps', 'Small Caps']
    ]
  },

  fontPercent: {
    selector: '.vjs-font-percent > select',
    id: '',
    label: 'Font Size',
    options: [
      ['0.50', '50%'],
      ['0.75', '75%'],
      ['1.00', '100%'],
      ['1.25', '125%'],
      ['1.50', '150%'],
      ['1.75', '175%'],
      ['2.00', '200%'],
      ['3.00', '300%'],
      ['4.00', '400%']
    ],
    default: 2,
    parser: (v) => v === '1.00' ? null : Number(v)
  },

  textOpacity: {
    selector: '.vjs-text-opacity > select',
    id: 'captions-foreground-opacity-%s',
    label: 'Opacity',
    options: [
      OPACITY_OPAQUE,
      OPACITY_SEMI
    ],
    className: 'vjs-text-opacity vjs-opacity'
  },

  // Options for this object are defined below.
  windowColor: {
    selector: '.vjs-window-color > select',
    id: 'captions-window-color-%s',
    label: 'Color',
    className: 'vjs-window-color'
  },

  // Options for this object are defined below.
  windowOpacity: {
    selector: '.vjs-window-opacity > select',
    id: 'captions-window-opacity-%s',
    label: 'Opacity',
    options: [
      OPACITY_TRANS,
      OPACITY_SEMI,
      OPACITY_OPAQUE
    ],
    className: 'vjs-window-opacity vjs-opacity'
  }
};

selectConfigs.windowColor.options = selectConfigs.backgroundColor.options;

/**
 * Get the actual value of an option.
 *
 * @param  {string} value
 *         The value to get
 *
 * @param  {Function} [parser]
 *         Optional function to adjust the value.
 *
 * @return {*}
 *         - Will be `undefined` if no value exists
 *         - Will be `undefined` if the given value is "none".
 *         - Will be the actual value otherwise.
 *
 * @private
 */
function parseOptionValue(value, parser) {
  if (parser) {
    value = parser(value);
  }

  if (value && value !== 'none') {
    return value;
  }
}

/**
 * Gets the value of the selected <option> element within a <select> element.
 *
 * @param  {Element} el
 *         the element to look in
 *
 * @param  {Function} [parser]
 *         Optional function to adjust the value.
 *
 * @return {*}
 *         - Will be `undefined` if no value exists
 *         - Will be `undefined` if the given value is "none".
 *         - Will be the actual value otherwise.
 *
 * @private
 */
function getSelectedOptionValue(el, parser) {
  const value = el.options[el.options.selectedIndex].value;

  return parseOptionValue(value, parser);
}

/**
 * Sets the selected <option> element within a <select> element based on a
 * given value.
 *
 * @param {Element} el
 *        The element to look in.
 *
 * @param {string} value
 *        the property to look on.
 *
 * @param {Function} [parser]
 *        Optional function to adjust the value before comparing.
 *
 * @private
 */
function setSelectedOption(el, value, parser) {
  if (!value) {
    return;
  }

  for (let i = 0; i < el.options.length; i++) {
    if (parseOptionValue(el.options[i].value, parser) === value) {
      el.selectedIndex = i;
      break;
    }
  }
}

/**
 * Manipulate Text Tracks settings.
 *
 * @extends ModalDialog
 */
class TextTrackSettings extends ModalDialog {

  /**
   * Creates an instance of this class.
   *
   * @param {Player} player
   *         The `Player` that this class should be attached to.
   *
   * @param {Object} [options]
   *         The key/value store of player options.
   */
  constructor(player, options) {
    options.temporary = false;

    super(player, options);

    this.updateDisplay = this.updateDisplay.bind(this);

    // fill the modal and pretend we have opened it
    this.fill();
    this.hasBeenOpened_ = this.hasBeenFilled_ = true;

    this.renderModalComponents(player);

    this.endDialog = createEl('p', {
      className: 'vjs-control-text',
      textContent: this.localize('End of dialog window.')
    });
    this.el().appendChild(this.endDialog);

    this.setDefaults();

    // Grab `persistTextTrackSettings` from the player options if not passed in child options
    if (options.persistTextTrackSettings === undefined) {
      this.options_.persistTextTrackSettings = this.options_.playerOptions.persistTextTrackSettings;
    }

    this.bindFunctionsToSelectsAndButtons();

    if (this.options_.persistTextTrackSettings) {
      this.restoreSettings();
    }
  }

  renderModalComponents(player) {
    const textTrackSettingsColors = new TextTrackSettingsColors(
      player,
      {
        textTrackComponentid: this.id_,
        selectConfigs,
        fieldSets:
        [
          ['color', 'textOpacity'],
          ['backgroundColor', 'backgroundOpacity'],
          ['windowColor', 'windowOpacity']
        ]
      }
    );

    this.addChild(textTrackSettingsColors);

    const textTrackSettingsFont = new TextTrackSettingsFont(
      player,
      {
        textTrackComponentid: this.id_,
        selectConfigs,
        fieldSets:
        [
          ['fontPercent'],
          ['edgeStyle'],
          ['fontFamily']
        ]
      }
    );

    this.addChild(textTrackSettingsFont);

    const trackSettingsControls = new TrackSettingsControls(player);

    this.addChild(trackSettingsControls);
  }

  bindFunctionsToSelectsAndButtons() {
    this.on(this.$('.vjs-done-button'), ['click', 'tap'], () => {
      this.saveSettings();
      this.close();
    });

    this.on(this.$('.vjs-default-button'), ['click', 'tap'], () => {
      this.setDefaults();
      this.updateDisplay();
    });

    Obj.each(selectConfigs, config => {
      this.on(this.$(config.selector), 'change', this.updateDisplay);
    });
  }

  dispose() {
    this.endDialog = null;

    super.dispose();
  }

  label() {
    return this.localize('Caption Settings Dialog');
  }

  description() {
    return this.localize('Beginning of dialog window. Escape will cancel and close the window.');
  }

  buildCSSClass() {
    return super.buildCSSClass() + ' vjs-text-track-settings';
  }

  /**
   * Gets an object of text track settings (or null).
   *
   * @return {Object}
   *         An object with config values parsed from the DOM or localStorage.
   */
  getValues() {
    return Obj.reduce(selectConfigs, (accum, config, key) => {
      const value = getSelectedOptionValue(this.$(config.selector), config.parser);

      if (value !== undefined) {
        accum[key] = value;
      }

      return accum;
    }, {});
  }

  /**
   * Sets text track settings from an object of values.
   *
   * @param {Object} values
   *        An object with config values parsed from the DOM or localStorage.
   */
  setValues(values) {
    Obj.each(selectConfigs, (config, key) => {
      setSelectedOption(this.$(config.selector), values[key], config.parser);
    });
  }

  /**
   * Sets all `<select>` elements to their default values.
   */
  setDefaults() {
    Obj.each(selectConfigs, (config) => {
      const index = config.hasOwnProperty('default') ? config.default : 0;

      this.$(config.selector).selectedIndex = index;
    });
  }

  /**
   * Restore texttrack settings from localStorage
   */
  restoreSettings() {
    let values;

    try {
      values = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY));
    } catch (err) {
      log.warn(err);
    }

    if (values) {
      this.setValues(values);
    }
  }

  /**
   * Save text track settings to localStorage
   */
  saveSettings() {
    if (!this.options_.persistTextTrackSettings) {
      return;
    }

    const values = this.getValues();

    try {
      if (Object.keys(values).length) {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(values));
      } else {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch (err) {
      log.warn(err);
    }
  }

  /**
   * Update display of text track settings
   */
  updateDisplay() {
    const ttDisplay = this.player_.getChild('textTrackDisplay');

    if (ttDisplay) {
      ttDisplay.updateDisplay();
    }
  }

  /**
   * Repopulate dialog with new localizations on languagechange
   */
  handleLanguagechange() {
    this.fill();
    this.renderModalComponents(this.player_);
    this.bindFunctionsToSelectsAndButtons();
  }

}

Component.registerComponent('TextTrackSettings', TextTrackSettings);

export default TextTrackSettings;
