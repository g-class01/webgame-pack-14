var UiInputField = pc.createScript('uiInputField');
UiInputField.attributes.add('inputPurpose', {
    type: 'number',
    enum: [
        { 'Standard': 0 },
        { 'Chat': 1 },
    ],
});
UiInputField.attributes.add('textEntity', {
    type: 'entity',
    title: 'Text Entity',
    description: 'The Entity that has the text Element to update with the inputted text.'
});
UiInputField.attributes.add('inputType', {
    type: 'string',
    title: 'Input Type',
    description: 'What type of input will this field accept. On some devices, the virtual keyboard layout may change as well. For example, \'Number\' will bring up a numpad instead of the full keyboard.',
    default: 'text',
    enum: [
        { 'Text': 'text' },
        { 'Text (no spellcheck)': 'text no spellcheck' },
        { 'Email': 'email' },
        { 'Number': 'number' },
        { 'Decimal': 'decimal' },
        { 'Password': 'password' },
        { 'Readonly': 'textNoEdit' },
    ],
});
UiInputField.attributes.add('enterKeyHint', {
    type: 'string',
    title: 'Enter Key Hint',
    description: 'Change what the enter key shows on the virutal keyboard. Different OSs will have different representations of the hint.',
    default: 'enter',
    enum: [
        { 'Enter': 'enter' },
        { 'Done': 'done' },
        { 'Go': 'go' },
        { 'Search': 'search' },
        { 'Send': 'send' }
    ],
});
UiInputField.attributes.add('maxLength', {
    type: 'number', default: 32,
    title: 'Max Length',
    description: 'Maximum length of the text can be.'
});
UiInputField.attributes.add('placeHolder', {
    type: 'string', default: 'Placeholder text...',
    title: 'Place Holder String',
    description: 'When the inputted text is empty, what should show as placeholder? Usually this is a prompt such as \'Enter your email here\'.'
});
UiInputField.attributes.add('placeHolderColor', {
    type: 'rgb',
    title: 'Place Holder Text Color',
    description: 'What color the text should be when the placeholder string is used.'
});


// initialize code called once per entity
UiInputField.prototype.initialize = function () {
    this._textElement = this.textEntity.element;
    this._textColor = this._textElement.color.clone();
    this.setEvents('on');
    if (this.value == null)
        this._onValueChange("");
    this.on('destroy', () => {
        this.setEvents('off');
    });
    this.replacements = {
        // English
        "ç": "c",
        "ğ": "g",
        "ı": "i",
        "İ": "I",
        "ö": "o",
        "ş": "s",
        "ü": "u",

        // Spanish
        "á": "a",
        "é": "e",
        "í": "i",
        "ó": "o",
        "ú": "u",
        "ñ": "n",

        // French
        "à": "a",
        "â": "a",
        "è": "e",
        "é": "e",
        "ê": "e",
        "î": "i",
        "ô": "o",
        "û": "u",

        // German
        "ä": "ae",
        "ß": "ss",

        // Italian
        "à": "a",
        "è": "e",
        "é": "e",
        "ì": "i",
        "ò": "o",
        "ù": "u",

        // Portuguese
        "ã": "a",
        "õ": "o",
        "á": "a",
        "é": "e",
        "í": "i",
        "ó": "o",
        "ú": "u",
        "ç": "c",

        // Dutch
        "ë": "e",
        "ï": "i",
        "ó": "o",

        // Danish
        "æ": "ae",
        "ø": "o",
        "å": "a",

        // Swedish
        "ä": "a",
        "å": "a",

        // Norwegian
        "ø": "o",
        "å": "a",

        // Finnish
        "ä": "a",

        // Icelandic
        "ð": "d",
        "þ": "th",

        // Polish
        "ą": "a",
        "ć": "c",
        "ę": "e",
        "ł": "l",
        "ń": "n",
        "ó": "o",
        "ś": "s",
        "ź": "z",
        "ż": "z",

        // Czech
        "č": "c",
        "ď": "d",
        "ě": "e",
        "ň": "n",
        "ř": "r",
        "š": "s",
        "ť": "t",
        "ů": "u",
        "ž": "z",

        // Hungarian
        "á": "a",
        "é": "e",
        "í": "i",
        "ó": "o",
        "ő": "o",
        "ú": "u",
        "ű": "u",

        // Romanian
        "ă": "a",
        "â": "a",
        "î": "i",
        "ș": "s",
        "ț": "t",

        // Catalan
        "à": "a",
        "è": "e",
        "é": "e",
        "í": "i",
        "ò": "o",
        "ó": "o",
        "ú": "u",

        // Basque
        "ñ": "n",
        "ñ": "n",

        // Galician
        "á": "a",
        "é": "e",
        "í": "i",
        "ó": "o",
        "ú": "u",

        // Irish
        "á": "a",
        "é": "e",
        "í": "i",
        "ó": "o",
        "ú": "u",
        "ñ": "n",

        // Welsh
        "â": "a",
        "ê": "e",
        "î": "i",
        "ô": "o",
        "û": "u",
        "ŵ": "w",
        "ŷ": "y",

        // Scottish Gaelic
        "à": "a",
        "è": "e",
        "ì": "i",
        "ò": "o",
        "ù": "u",
        "À": "A",
        "È": "E",
        "Ì": "I",
        "Ò": "O",
        "Ù": "U",

        // Breton
        "â": "a",
        "ê": "e",
        "ñ": "n",
        "ô": "o",
        "û": "u",

        // Esperanto
        "ĉ": "c",
        "ĝ": "g",
        "ĥ": "h",
        "ĵ": "j",
        "ŝ": "s",
        "ŭ": "u",
    };
};


UiInputField.prototype.setEvents = function (offOn) {
    this.entity[offOn]('uiinput:updatevalue', this._onValueChange, this);
    this.entity.element[offOn]('click', this._onClick, this);
};


UiInputField.prototype._onValueChange = function (value) {
    if (this.inputPurpose === 1 && value != '') { // chat input
        for (const [key, replacement] of Object.entries(this.replacements)) {
            value = value.replaceAll(key, replacement);
        }
        if (this.app.room)
            this.app.room.send("Client:SendChatMessage", value);
        this.value = "";
        this._textElement.text = this.placeHolder;
        this._textElement.color = this.placeHolderColor;
    } else {
        this.value = value;
        if (value.length > 0) {
            if (this.inputType === 'password') {
                let hiddenText = '';
                for (let i = 0; i < value.length; ++i) {
                    hiddenText += '*';
                }

                this._textElement.text = hiddenText;
            } else {
                if (this.inputType === "number") {
                    if (value.length > this.maxLength) {
                        value = value.slice(0, this.maxLength);
                        this.app.fire('WarningTextController:setWarning', "Max limit for the number exceeded! Setting it to " + numRound(value), 5, new pc.Color(1, 0.9, 0, 1));
                    }
                    this.app.fire("InputField:NumberSet", value);
                    this._textElement.text = value;
                } else {
                    this._textElement.text = value;
                }

            }

            this._textElement.color = this._textColor;
        } else {
            this._textElement.text = this.placeHolder;
            this._textElement.color = this.placeHolderColor;
        }
        this.entity.fire('updatedvalue', value);
    }
};

UiInputField.prototype._onClick = function (event) {
    this.app.fire('uiinput:clicked', this, event);
};


// swap method called for script hot-reloading
// inherit your script state here
// UiInputField.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// https://developer.playcanvas.com/en/user-manual/scripting/