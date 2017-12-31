'use strict';

module.exports = (() => {
    const fs = require('fs');
    const request = require('request');
    const parser = require('./parser');
    const path = require("path");


    class WargamingApi {
        constructor(appId) {
            this.appId = appId;
        }

        static get baseUrls() {
            return {
                warships: 'https://api.worldofwarships.'    // add the tld dynamically later
                
            }
        }

        static errorMessages (type, info, normalizedServer) {
            switch (type.toUpperCase()) {
                case 'INVALID_SEARCH':
                    return 'Player "' + info.search + '" not found on server ' + normalizedServer + '.';
                
                default:
                    return 'The error type ' + type + ' was created from sekrit russian documents. Please yell at the bot developer to fix this.'
            }
        }
    
        searchShipsPlayers(search, normalizedServer) {
            return this.apiCall({
                normalizedServer: normalizedServer,
                endpoint: '/account/list/',
                body: {
                    search: search
                }
            })
            .then((response) => {
                // only care about the player list
                return Promise.resolve(response.data);
            })
            .catch((err) => {
                return Promise.reject(err);
            });
        }

        getMatchingPlayer(search, normalizedServer) {
            let match;
            return new Promise((resolve, reject) => {
                this.searchShipsPlayers(search, normalizedServer)
                .then((players) => {
                    if (players.length < 1) {
                        return reject(new Error('Zero possible matches for search \"' + search + '\" on ' + normalizedServer + ' found. Please check the spelling and try again.'));
                    }

                    for (let i = 0; i < players.length; i++) {
                        let currentPlayer = players[i];
    
                        if (search.toUpperCase() === currentPlayer.nickname.toUpperCase()) {
                            match = currentPlayer;
                            break;
                        }
                    }
    
                    console.log('match')
                    console.log(match)
    
                    if (!match) {
                        return reject(new Error('No exact match for player ' + search + ' on ' + normalizedServer + ' found. Please provide the full username.'));
                    }
    
                    return resolve(match);
                })
                .catch((err) => {
                    return reject(err);
                });
            })
           
        }

        // checkIfProfileIsPrivate(account_id) {
        //     return new Promise((resolve, reject) => {

        //     })
        // }

        getAccountInfo (account_id, normalizedServer) {
            return new Promise((resolve, reject) => {
                this.apiCall({
                    normalizedServer: normalizedServer,
                    endpoint: '/account/info/',
                    body: {
                        account_id: account_id
                    }
                })
                .then((response) => {
                    console.log('getAccountInfo request resolved')
                    return resolve(response)
                })
                .catch((err) => {
                    return reject(err);
                })
            })
        }

        getPvpShipsData (account_id, normalizedServer) {
            return new Promise((resolve, reject) => {
                this.apiCall({
                    normalizedServer: normalizedServer,
                    endpoint: '/ships/stats/',
                    body: {
                        account_id: account_id
                    }
                })
                .then((response) => {
                    console.log('got pvpShipsData');
                    let pvpShipsData = response.data[account_id];
                    return resolve(pvpShipsData)
                })
                .catch((err) => {
                    return reject(err);
                })
            })
        }



        apiCall(options) {
            // mandatory fields
            return new Promise((resolve, reject) => {
                let tld = parser.getTld(options.normalizedServer);  // returns null if not found, but if the normalized server doesn't work then heck it

                let encodedBody = 'application_id=' + this.appId;

                for (let field in options.body) {
                    if (options.body.hasOwnProperty(field)) {
                        encodedBody += '&';
                        encodedBody += field + '=' + encodeURIComponent(options.body[field]);
                    }
                }

                let requestOptions = {
                    url: WargamingApi.baseUrls.warships + tld + '/wows' + options.endpoint,
                    headers: {
                        'Content-Type': 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8'
                    },
                    body: encodedBody
                };

                console.log('sending wg api call');
                console.log(requestOptions);

                request.post(requestOptions, (err, response, body) => {
                    let parsed = JSON.parse(body);
                    // console.log('got response');
                    // console.log(parsed);

                    if (err || parsed.status !== 'ok') {  // wargaming sends all errors as 200 REEEEEEEEEEEEEEEEEEE
                        let errType = parsed.error.message;

                        return reject(new Error(WargamingApi.errorMessages(
                            errType, 
                            options.body,
                            options.normalizedServer
                        )));
                    }
                    else {
                        console.log('got api response');
                        return resolve(parsed);
                    }
                });
            })
            .then((response) => {
                return Promise.resolve(response);
            })
            .catch((err) => {
                return Promise.reject(err);
            })
        }
    }

    return WargamingApi;
})()