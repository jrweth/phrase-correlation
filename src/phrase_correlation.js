(function(window, $) {
    //the poem text array derived from the csv file
    var poemTextArray;

    //the poem phrases array dervied from the csv file
    var poemPhrasesArray;

    //the poem phrases summarized by distinct phrase
    var poemPhrases;

    //the poem lines
    var poemLines;

    //the poem words
    var poemWords;

    //the number of lines in the poem
    var numLines;

    //the container for the poem
    var $poemContainer;

    var recordings;

    var selectedRecordings;

    /**
     * Parse CSV data into a 2 dimensional array
     * @param strData
     * @param strDelimiter
     * @returns {[*]}
     * @constructor
     */
    this.CSVToArray = function( strData, strDelimiter ) {
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

    /**
     * Go get the poem text and parse into an array - when done check if we are ready to run correlation
     * @param csvFileUrl
     */
    this.parsePoemTextFromCsvUrl = function(csvFileUrl) {
        $.ajax(csvFileUrl)
            .done(function(response) {
                poemTextArray = CSVToArray(response);
                checkFinished();
            });
    };

    /**
     * Go get the poem phrases and parse into array - when done check if we are ready to run correlation
     * @param csvFileUrl
     */
    this.parsePoemPhrasesFromCsvUrl = function(csvFileUrl) {
        $.ajax(csvFileUrl)
            .done(function(response) {
                poemPhrasesArray = CSVToArray(response);
                checkFinished();
            });
    };

    /**
     * Check to see if both the Phrases and Text have been loaded
     * If they are then process the data and create dom elements
     */
    this.checkFinished = function()
    {
        if(poemPhrasesArray && poemTextArray) {
            processData();
            createElements();
        }
    };

    /**
     * Get all of the phrases which contain the specified word
     * @param lineNum
     * @param wordNum
     */
    this.getPhrasesByWord = function(lineNum, wordNum)
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
                matchedPhrases.push(phraseId);
            }
        }

        //sort the matched phrases from most correleted to least correlated
        matchedPhrases.sort(function(phraseId1, phraseId2) {
            //phrase2 more correlated
            if(poemPhrases[phraseId2].recordings.length > poemPhrases[phraseId1].recordings.length) {
                return 1;
            }
            //phrase1  more correlated
            else if(poemPhrases[phraseId2].recordings.length < poemPhrases[phraseId1].recordings.length) {
                return -1;
            }
            //most be equal -- go with the shortest phrase
            else {
               return(poemPhrases[phraseId1].numWords - poemPhrases[phraseId2].numWords);
            }
        });
        return matchedPhrases;

    };

    this.processData = function()
    {
        poemPhrases = {};
        poemWords = {};
        recordings = {};
        console.log(poemPhrasesArray);
        for(var i=1; i< poemPhrasesArray.length; i++ ) {


            var phrase = {
                'recordingName': poemPhrasesArray[i][0],
                'recordingUrl': poemPhrasesArray[i][1],
                'startTime': poemPhrasesArray[i][2],
                'endTime': poemPhrasesArray[i][3],
                'startLine': parseInt(poemPhrasesArray[i][4]),
                'startWord': parseInt(poemPhrasesArray[i][5]),
                'endLine': parseInt(poemPhrasesArray[i][6]),
                'endWord': parseInt(poemPhrasesArray[i][7])
            }
            phrase.id = phrase.startLine + '.' + phrase.startWord + '-' + phrase.endLine + '.' + phrase.endWord;

            //save the recording
            if(typeof(recordings[phrase.recordingName]) === 'undefined') {
                recordings[phrase.recordingName] = {
                    name: phrase.recordingName,
                    url: phrase.recordingUrl,
                    phrases: {}
                };
            }

            recordings[phrase.recordingName].phrases[phrase.id] = {
                startTime: phrase.startTime,
                endTime: phrase.endTime
            };

            //save the phrase
            if(typeof(poemPhrases[phrase.id]) === 'undefined') {
                poemPhrases[phrase.id] = {
                    'startLine': phrase.startLine,
                    'startWord': phrase.startWord,
                    'endLine': phrase.endLine,
                    'endWord': phrase.endWord,
                    'recordings': [phrase.recordingName]
                }
            }
            else {
                poemPhrases[phrase.id].recordings.push(phrase.recordingName);
            }
        }

        selectedRecordings = [];
        for(var recordingName in recordings) {
           selectedRecordings.push(recordingName);
        }

        //parse the lines
        numLines = poemTextArray.length;
        poemLines = {};
        for(var lineIndex=0; lineIndex<poemTextArray.length; lineIndex++) {
            var line = {
                'lineNum': lineIndex+1,
                'words' : {}
            };

            var wordArray = poemTextArray[lineIndex];
            if (checkLineEmpty(wordArray)) {
                line.isEmpty = true;
                line.words = {};
            }
            else {
                line.isEmpty = false;
                line.numWords = 0;
                //parse the words
                for(var wordIndex =0 ; wordIndex < wordArray.length; wordIndex++) {
                    //if no text in the word just continue
                    if(wordArray[wordIndex].trim().length ===0 ) continue;
                    var word = { 'wordNum': wordIndex+1 };
                    word.text = wordArray[wordIndex];
                    word.lineNum = line.lineNum;
                    word.wordId = line.lineNum.toString() + '.' + word.wordNum.toString();

                    //add word to the line
                    line.words[word.wordNum.toString()] = word;
                    poemWords[word.wordId] = word;
                    line.numWords++;
                }
            }

            poemLines[line.lineNum.toString()] = line;
        }

        //go get the words in the phrase
        for(var phraseIndex in poemPhrases) {
            poemPhrases[phraseIndex].numWords = getNumWordsInPhrase(poemPhrases[phraseIndex]);
        }

        this.matchWordsToPhrases();
        console.log(poemLines);
        console.log(poemPhrases);
        console.log(recordings);
    }

    /**
     *
     */
    this.matchWordsToPhrases = function()
    {
        for(var lineNum in poemLines) {
            var line = poemLines[lineNum];
            for(var wordNum in line.words) {
                var word = line.words[wordNum];
                var matchedPhrases = getPhrasesByWord(line.lineNum,word.wordNum);

                poemLines[lineNum].words[wordNum].matchedPhrases = matchedPhrases;
                if(matchedPhrases.length === 0) {
                    poemLines[lineNum].words[wordNum].maxCorrelated = 0;
                    poemLines[lineNum].words[wordNum].lastOfPhrase = false;
                }
                else {
                    var maxPhrase = poemPhrases[matchedPhrases[0]];
                    poemLines[lineNum].words[wordNum].maxCorrelated = maxPhrase.recordings.length;
                    poemLines[lineNum].words[wordNum].firstOfPhrase = word.lineNum === maxPhrase.startLine && word.wordNum === maxPhrase.startWord;
                    poemLines[lineNum].words[wordNum].lastOfPhrase  = word.lineNum === maxPhrase.endLine && word.wordNum === maxPhrase.endWord;
                }
            }
        }

    }

    this.getNumWordsInPhrase = function(phrase) {
        var numWords = 0;

        for(var lineNum = phrase.startLine; lineNum <= phrase.endLine; lineNum++) {
            var line = poemLines[lineNum.toString()];
            for(var wordIndex in line.words) {
                var word = line.words[wordIndex];

                numWords++;
                //doesn't count -- before start word
                if(lineNum === phrase.startLine && word.wordNum < phrase.startWord) numWords--;
                //doesn't count -- after end word
                if(lineNum === phrase.endLine && word.wordNum > phrase.endWord) numWords--;
            }
        }
        return numWords;
    }

    this.checkLineEmpty = function(wordArray)
    {
        for(var i = 0; i < wordArray.length; i++) {
           if(wordArray[i].trim().length > 0) return false;
        }
        return true;
    };


    this.createElements = function() {
        var $formatted, $graph, $graphWords, $recordingControls;

        //set up format to contain formatted poem text
        $formatted = $('<div class="pc-formatted"/>');


        //set up graph to contain graph of phrases
        $graph = $('<div class="pc-graph"/>');
        $graph.css('height', recordings.length + 'em');

        //set up the graph word line
        $graphWords = $('<div class="pc-graph-words"/>');
        $graph.append($graphWords);

        //set up the recording controls
        $recordingControls = $('<div class="pc-recording-controls"/>');
        $recordingControls.append('<div class="pc-recording-control">Summary</div>');

        //set up a line for each recording
        var $graphRecordingWords = {};
        for(var recordingName in recordings) {
            $graphRecordingWords[recordingName] = $('<div class="pc-recording-graph"/>');
            $graph.append($graphRecordingWords[recordingName]);

            $recordingControls.append('<div class="pc-recording-control">' + recordingName + '</div>');
        }

        //set up the recording labels

        for(var lineNum = 1; lineNum <= numLines; lineNum++) {
            var line = poemLines[lineNum.toString()];

            //create each line
            $line = $("<div class='pc-line'/>");
            if(line.isEmpty) {
                $line.addClass('pc-line-empty');
                $line.html('&#160;');
            }
            else {
                //Loop through each word and add it to the line
                for(var wordNum = 1; wordNum <= line.numWords; wordNum++) {
                    var word = line.words[wordNum.toString()];
                    if(word.text.length > 0) {
                        $word = $("<div class='pc-word'/>");
                        $word.html(word.text);

                        for (var recordingName in recordings) {
                            var $recordingWord = $word.clone();
                            $recordingWord.addClass(getRecordingCorrelationClass(recordingName, word));
                            var phrase = this.getRecordingWordPhrase(recordingName, word);
                            if(phrase === null) {
                                $recordingWord.addClass('pc-no-phrase');
                            }
                            if(phrase && word.lineNum === phrase.startLine && word.wordNum === phrase.startWord) {
                                $recordingWord.addClass('pc-phrase-first-word');
                            }
                            if(phrase && word.lineNum === phrase.endLine && word.wordNum === phrase.endWord) {
                                $recordingWord.addClass('pc-phrase-last-word');
                            }
                            $graphRecordingWords[recordingName].append($recordingWord);
                        }

                        $word.addClass(getCorrelationClass(word));
                        if (word.lastOfPhrase) {
                            $word.addClass('pc-phrase-last-word');
                        }
                        if (word.firstOfPhrase) {
                            $word.addClass('pc-phrase-first-word');
                        }

                        $line.append($word);
                        $graphWords.append($word.clone());
                    }
                }
            }
            $formatted.append($line);
        }

        $poemContainer.append($recordingControls);
        $poemContainer.append($graph);
        $poemContainer.append($formatted);
    };

    this.getBackgroundColor = function(word) {
        var percentage, hue, saturation, lightness;
        if(Object.keys(recordings) == 1) {
            percentage = 0;
        }
        else {
            percentage = (word.maxCorrelated - 1)/ (Object.keys(recordings).length - 1);
        }

        hue = 360 * percentage;

        saturation = 100 *(1 - percentage);
        saturation = 75;

        lightness = 100 * (1-percentage);


        var brightness = Math.floor(255 - percentage * 254);

        var color = 'hsl(' + hue + ', ' + saturation + '%,' + lightness +'%)';
        return color;
    };

    this.getCorrelationClass = function(word) {
        if(word.maxCorrelated === 1) {
            return 'pc-correlation-none';
        }
        else if(word.maxCorrelated === selectedRecordings.length) {
            return 'pc-correlation-all';
        }
        else {
            return 'pc-correlation-' + word.maxCorrelated.toString() + 'of' + selectedRecordings.length.toString();
        }
    }

    this.getRecordingCorrelationClass = function(recordingName, word) {
        var phrase = this.getRecordingWordPhrase(recordingName, word);
        if(phrase === null) return 'pc-correlation-none';

        var correlated = phrase.recordings.length;
        if(correlated === 1) {
            return 'pc-correlation-none';
        }
        else if(correlated === selectedRecordings.length) {
            return 'pc-correlation-all';
        }
        else {
            return 'pc-correlation-' + correlated.toString() + 'of' + selectedRecordings.length.toString();
        }

    }

    /**
     * Get the phrase that the specified word in the specified recording belongs to
     * @param recordingName
     * @param word //object containing word
     * @returns {*}
     */
    this.getRecordingWordPhrase = function(recordingName, word)
    {
        for(var mPhraseIndex = 0; mPhraseIndex< word.matchedPhrases.length; mPhraseIndex++) {
            var phrase = poemPhrases[word.matchedPhrases[mPhraseIndex]];
            if(phrase.recordings.indexOf(recordingName)>-1) {
                return phrase;
            }
        }
        return null;
    }


    this.getTextColor = function(word) {
        var percentage, color;

        percentage = (word.maxCorrelated - 1)/ (Object.keys(recordings).length - 1);

        if(percentage < .5) {
            color = "black";
        }
        else {
            color = "white";
        }

        return color;

    };

    var wordIsPhraseStartWord = function(lineNum, wordNum, recordingName) {

        var phrases = getPhrasesByWord(lineNum, wordNum);
        for(var i=0; i< phrase.length; i++) {

            if(lineNum === phrases[i].startLine && wordNum === phrases[i].startWord) {
                for(var j=0; j < phrases[i].recordings; j++) {
                    if (phrases[i].recordings[j].recordingName === recordingName) {
                        return true;
                    }
                }
            }
        }

        return false;
    };

    var wordIsPhraseEndWord = function(lineNum, wordNum, recordingName) {

        var phrases = getPhrasesByWord(lineNum, wordNum);
        for(var i=0; i< phrase.length; i++) {

            if(lineNum === phrases[i].endLine && wordNum === phrases[i].endWord) {
                for(var j=0; j < phrases[i].recordings; j++) {
                    if (phrases[i].recordings[j].recordingName === recordingName) {
                        return true;
                    }
                }
            }
        }

        return false;
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
    };

    window.phraseCorrelator = {
        init: init,
        getPoemLines: function() { return poemLines;}
    };
})(window, jQuery);