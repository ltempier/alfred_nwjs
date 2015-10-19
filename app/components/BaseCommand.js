var when = require('when');
var sequence = require('when/sequence');
var util = require('util');
var extend = require('xtend');
var readline = require('readline');
var chalk = require('chalk');

var BaseCommand = function (cli, options) {
	this.cli = cli;
	this.optionsByName = {};
	this.descriptionsByName = {};
};

BaseCommand.prototype = {
	/**
	 * exposed by the help command
	 */
	name: null,
	description: null,


	getPrompt: function () {
		if (!this._prompt) {
			this._prompt = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
		}
		return this._prompt;
	},

	promptDfd: function (message) {
		var dfd = when.defer();
		var prompt = this.getPrompt();
		prompt.question(message, function (value) {
			dfd.resolve(value);
		});
		return dfd.promise;
	},
	passPromptDfd: function (message) {
		var dfd = when.defer();
		var prompt = this.getPrompt();

		//process.stdin.setRawMode(true);
		prompt.question(message, function (value) {
			//process.stdin.setRawMode(false);
			dfd.resolve(value);
		});
		return dfd.promise;
	},

	addOption: function (name, fn, desc) {
		this.optionsByName[name] = fn;
		this.descriptionsByName[name] = desc;
	},

	runCommand: function (args) {
		//default to wildcard
		var cmdName = "*";
		var cmdFn = this.optionsByName[cmdName];

		//or, if we have args, try to grab that command and run that instead
		if (args && (args.length >= 1)) {
			cmdName = args[0];

			if (this.optionsByName[cmdName]) {
				cmdFn = this.optionsByName[cmdName];
				args = args.slice(1);
			}
		}

		//run em if we got em.
		if (cmdFn) {
			if (!util.isArray(args)) {
				args = [args];
			}

			return cmdFn.apply(this, args);
		}
		else {
			//no wildcard, and no function specified...

			//console.log('running help for command');
			return this.cli.runCommand("help", this.name);
		}
	},
	error: function (str, exit) {

		var name = this.name;
		if (!str) {
			str = "Unknown error";
		}
		str = "%s: " + str;

		console.log();
		console.log(chalk.bold.red('!'), chalk.bold.white(util.format(str, name)));
		if (exit || exit === undefined) {
			process.exit(1);
		}
	},
	_: null
};
