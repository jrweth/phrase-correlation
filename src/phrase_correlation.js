(function(window, $) {
    //the poem text array derived from the csv file
    var poemTextArray;

    //the poem phrases array dervied from the csv file
    var poemPhrasesArray;

    //the poem phrases summarized by distinct phrase
    var poemPhrases;

    //the poem words
    var poemWords;

    //the poem lines
    var poemLines;

    //the number of lines in the poem
    var numLines;

    //the container for the poem
    var $poemContainer;

    var recordings;

    var CSVToArray = function( strData, strDelimiter ) {
        // Check to see if the delimiter is defined. If not,
        // then default to comma.
        strDelimiter = (strDelimiter || ",");

        // Create a regular expression to parse the CSV values.
        var objPattern = new RegExp(
            (
                // Delimiters.
                "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

                // Quoted fields.
                "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

                // Standard fields.
                "([^\"\\" + strDelimiter + "\\r\\n]*))"
            ),
            "gi"
        );


        // Create an array to hold our data. Give the array
        // a default empty first row.
        var arrData = [[]];

        // Create an array to hold our individual pattern
        // matching groups.
        var arrMatches;


        // Keep looping over the regular expression matches
        // until we can no longer find a match.
        while (arrMatches = objPattern.exec(strData)) {

            // Get the delimiter that was found.
            var strMatchedDelimiter = arrMatches[1];

            // Check to see if the given delimiter has a length
            // (is not the start of string) and if it matches
            // field delimiter. If id does not, then we know
            // that this delimiter is a row delimiter.
            if (
                strMatchedDelimiter.length &&
                strMatchedDelimiter !== strDelimiter
            ) {

                // Since we have reached a new row of data,
                // add an empty row to our data array.
                arrData.push([]);

            }

            var strMatchedValue;

            // Now that we have our delimiter out of the way,
            // let's check to see which kind of value we
            // captured (quoted or unquoted).
            if (arrMatches[2]) {

                // We found a quoted value. When we capture
                // this value, unescape any double quotes.
                strMatchedValue = arrMatches[2].replace(
                    new RegExp("\"\"", "g"),
                    "\""
                );

            } else {

                // We found a non-quoted value.
                strMatchedValue = arrMatches[3];

            }


            // Now that we have our value string, let's add
            // it to the data array.
            arrData[arrData.length - 1].push(strMatchedValue);
        }

        // Return the parsed data.
        return ( arrData );
    };

    var parsePoemTextFromCsvUrl = function(csvFileUrl) {
        $.ajax(csvFileUrl)
            .done(function(response) {
                poemTextArray = CSVToArray(response);
                checkFinished();
            });
    };

    var parsePoemPhrasesFromCsvUrl = function(csvFileUrl) {
        $.ajax(csvFileUrl)
            .done(function(response) {
                poemPhrasesArray = CSVToArray(response);
                checkFinished();
            });
    };

    /**
     * Check to see if both the Phrases and Text have been loaded
     */
    var checkFinished = function()
    {
        if(poemPhrasesArray && poemTextArray) {
            console.log(poemPhrasesArray);
            console.log(poemTextArray);
            processData();
            createElements();
        }
    };

    /**
     * Get all of the phrases which contain the specified word
     * @param lineNum
     * @param wordNum
     */
    var getPhrasesByWord = function(lineNum, wordNum)
    {
        //for ease of comparison we will convert the lineNum and wordNum to a number
        var searchIndex = lineNum * 1000 + wordNum;

        var matchedPhrases = [];
        for(var phraseId in poemPhrases) {
            var phrase = poemPhrases[phraseId];

            //for ease of comparison
            startIndex = phrase.startLine * 1000 + phrase.startWord;
            endIndex = phrase.endLine * 1000 + phrase.endWord;

            if(startIndex <= searchIndex && searchIndex <= endIndex) {
                matchedPhrases.push(phrase);
            }
        }

        //sort the matched phrases from most correleted to least correlated
        matchedPhrases.sort(function(phrase1, phrase2) {
           return phrase2.recordings.length - phrase1.recordings.length;
        });
        return matchedPhrases;

    }

    var processData = function()
    {
        poemPhrases = {};
        recordings = {};
        for(var i=1; i< poemPhrasesArray.length; i++ ) {

            var phrase = {
                'recordingName': poemPhrasesArray[i][0],
                'recordingUrl': poemPhrasesArray[i][1],
                'startTime': parseFloat(poemPhrasesArray[i][2]),
                'endTime': parseFloat(poemPhrasesArray[i][3]),
                'startLine': parseInt(poemPhrasesArray[i][4]),
                'startWord': parseInt(poemPhrasesArray[i][5]),
                'endLine': parseInt(poemPhrasesArray[i][6]),
                'endWord': parseInt(poemPhrasesArray[i][7])
            };
            phrase.id = phrase.startLine + '.' + phrase.startWord + '-' + phrase.endLine + '.' + phrase.endWord;

            //save the recording
            if(typeof(recordings[phrase.recordingName] === 'undefined')) {
                recordings[phrase.recordingName] = {
                    name: phrase.recordingName,
                    url: phrase.recordingUrl
                };
            }

            //save the phrase
            if(typeof(poemPhrases[phrase.id]) === 'undefined') {
                poemPhrases[phrase.id] = {
                    'startLine': phrase.startLine,
                    'startWord': phrase.startWord,
                    'endLine': phrase.endLine,
                    'endWord': phrase.endWord,
                    'recordings': [recordings[phrase.recordingName]]
                }
            }
            else {
                poemPhrases[phrase.id].recordings.push(recordings[phrase.recordingName]);
            }
        }
        console.log(poemPhrases);
        console.log(recordings);

        //parse the lines
        numLines = poemTextArray.length;
        poemLines = {};
        for(var lineIndex=0; lineIndex<poemTextArray.length; lineIndex++) {
            var line = {
                'lineNum': lineIndex+1,
                'words' : {}
            };

            var wordArray = poemTextArray[lineIndex];
            if (wordArray.length === 0 || (wordArray.length === 1 && wordArray[0].trim().length === 0)) {
                line.isEmpty = true;
                line.words = {};
            }
            else {
                line.isEmpty = false;
                line.numWords = wordArray.length;
                //parse the words
                for(var wordIndex =0 ; wordIndex < wordArray.length; wordIndex++) {
                    var word = { 'wordNum': wordIndex+1 };
                    word.text = wordArray[wordIndex];
                    word.lineNum = line.lineNum;

                    //check on relationship to matched phrases
                    word.matchedPhrases = getPhrasesByWord(line.lineNum, word.wordNum);
                    if(word.matchedPhrases.length === 0) {
                        word.maxCorrelated = 0;
                        word.lastOfPhrase = false;
                    }
                    else {
                        var maxPhrase = word.matchedPhrases[0];
                        word.maxCorrelated = maxPhrase.recordings.length;
                        word.lastOfPhrase  = word.lineNum === maxPhrase.endLine && word.wordNum === maxPhrase.endWord;
                    }

                    //add word to the line
                    line.words[word.wordNum.toString()] = word;
                }
            }

            poemLines[line.lineNum.toString()] = line;
        }
        console.log(poemLines);
    };

    /**
     * Initialize the correlator
     * @param options
     * - poemTextCsvUrl:    (required) The url of the csv file containing the poem text
     * - poemPhrasesCsvUrl: (required) The url of the csv file containing the poem phrases
     * - poemContainer:    (required) jQuery object of the poem container
     */
    var init = function(options)
    {
        parsePoemTextFromCsvUrl(options.poemTextCsvUrl);
        parsePoemPhrasesFromCsvUrl(options.poemPhrasesCsvUrl);
        $poemContainer = options.poemContainer;
    }

    var createElements = function() {
        for(var lineNum = 1; lineNum <= numLines; lineNum++) {
            var line = poemLines[lineNum.toString()];

            //create each line
            $line = $("<div/>");
            $line.addClass('line');
            if(line.isEmpty) {
                $line.addClass('line-empty');
                $line.html('&#160;');
            }
            else {
                //Loop through each word and add it to the line
                for(var wordNum = 1; wordNum <= line.numWords; wordNum++) {
                    var word = line.words[wordNum.toString()];
                    $word = $("<span/>");
                    $word.addClass('word');
                    $word.css('background-color', getBackgroundColor(word));
                    $word.css('color', getTextColor(word));
                    $word.html(word.text + ' ');
                    if(word.lastOfPhrase) {
                        $word.css('border-right', '2px solid red');
                    }
                    $line.append($word);
                }
            }
            $poemContainer.append($line);
        }
    }

    var getBackgroundColor = function(word) {
        var percentage = word.maxCorrelated / Object.keys(recordings).length;
        var brightness = Math.floor(255 - percentage * 254);

        var color = 'rgb(' + brightness + ', ' + brightness + ',' + brightness +')';
        return color;
    }

    var getTextColor = function(word) {
        var percentage = word.maxCorrelated / Object.keys(recordings).length;
        var brightness = (255 - Math.floor(percentage * 254) + 128th) % 255;


        var color = 'rgb(' + brightness + ', ' + brightness + ',' + brightness +')';

        return color;

    }

    window.phraseCorrelator = {
        init: init,
        getPoemLines: function() { return poemLines;}
    };
})(window, jQuery);