#! /usr/bin/env node

// ==============================
// MODULES
// ==============================
var torStream 	= require('torrent-stream');
var tpb 		= require('thepiratebay');
var spawn 		= require('child_process').spawn;
var inquirer 	= require('inquirer');
var program 	= require('commander');
var path 		= require('path');
var pkg 		= require( path.join(__dirname, 'package.json') );


// ==============================
// VARIABLES
// ==============================
var orderEnum = {
	NAME: '1',
	DATE: '3',
	SIZE: '5',
	SEEDS: '7',
	LEECHES: '9'
}

var argEnum = {
	MAGNET: '0',
	SEARCH: '1'
}

// ==============================
// FUNCTIONS
// ==============================
/*
 * @param: args - the arguments the user entered
 * Starts streaming the torrent using peerflix
 */
function playMagnet(args) {
	var cmd = spawn('peerflix', args);
	cmd.stdout.pipe(process.stdout);
	cmd.stderr.pipe(process.stdout);
}

/*
 * @param: magnet - a magnet link for a torrent
 * @param: options - an options object
 * Starts streaming the torrent form a magnet link and passes
 * any options off to the playMagnet function
 */
function playCommand(magnet, options) {
	var ops = options.parent.rawArgs.splice(4);
	var playArgs = [magnet];
	ops.forEach(function(op) {
		playArgs.push(op);
	});
	playMagnet(playArgs);
}

/*
 * @param: query - the search query the user entered
 * @param: options - an options object
 * Searches the pirate bay for videos with the given query and returns
 * a list of torrent objects
 */
function searchCommand(query, options) {
	var torrentHash = [];
	var torrentInfos = [];
	var orderBy = options.order;
	var order;
	var infoField;

	switch (orderBy) {
		case 'name':
			order = orderEnum.NAME;
			infoField = 'seeders';
			break;
		case 'date':
			order = orderEnum.DATE;
			infoField = 'uploadDate';
			break;
		case 'size':
			order = orderEnum.SIZE;
			infoField = 'size';
			break;
		case 'seeds':
			order = orderEnum.SEEDS;
			infoField = 'seeders';
			break;
		case 'leeches':
			order = orderEnum.LEECHES;
			infoField = 'leechers';
			break;
		default:
			order = orderEnum.SEEDS;
			infoField = 'seeders';
	}

	tpb.search(query, {
		category: 200,
		orderBy: order
	}, function(err, results) {
		if (err) {
			console.log(err);
		} else {
			results.forEach(function(result, i, results) {
				torrentHash[result.name] = result.magnetLink;
				torrentInfos.push(result.name + ' :: ' + result[infoField]);
			});
			inquirer.prompt([
				{
					type: 'list',
					name: 'title',
					message: 'Which torrent do you want to stream?',
					choices: torrentInfos
				}
			], function(answer) {
				var title = answer.title;
				var titleSubstring = title.substring(0, title.indexOf(' :: '));
				playMagnet([torrentHash[titleSubstring], '--vlc']);
			});
		}
	});
}

// ==============================
// LOGIC
// ==============================
program
	.version('0.0.1');

program
	.command('play [magnet]')
	.description('stream a torrent file with the given magnet link')
	.option('-v, --vlc', 'open the torrent stream with vlc player')
	.action(function(magnet, options) {
		playCommand(magnet, options);
	});
program
	.command('search [query]')
	.description('search the pirate bay with a query')
	.option('-o, --order [orderBy]', 
		'order results by a given field:' +
		'seeds (default) | name | date | size | leeches')
	.action(function(query, options) {
		searchCommand(query, options);
	});

program.parse(process.argv);

