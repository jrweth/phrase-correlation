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

    //object containing recordings keyed on recording name
    var recordings;

    var selectedRecordings;

    //holds the most recent timeout call for cancelling
    var timeOut;

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
            onResize();
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


    /**
     * Process the data which has been converted from CSV
     */
    this.processData = function()
    {
        poemPhrases = {};
        poemLines = {};
        poemWords = {};
        recordings = {};
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
                endTime: phrase.endTime,
                duration: this.timeToSeconds(phrase.endTime) - this.timeToSeconds(phrase.startTime)
            };

            //save the phrase
            if(typeof(poemPhrases[phrase.id]) === 'undefined') {
                poemPhrases[phrase.id] = {
                    'id':         phrase.id,
                    'startLine':  phrase.startLine,
                    'startWord':  phrase.startWord,
                    'endLine':    phrase.endLine,
                    'endWord':    phrase.endWord,
                    'recordings': [phrase.recordingName],
                    'words': []
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
            poemPhrases[phraseIndex].words = getWordsInPhrase(poemPhrases[phraseIndex]);
        }

        this.matchWordsToPhrases();
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

    this.getWordsInPhrase = function(phrase) {
        var words;
        words = [];
        for(var lineNum = phrase.startLine; lineNum <= phrase.endLine; lineNum++) {
            var line = poemLines[lineNum.toString()];
            for(var wordIndex in line.words) {
                var word = line.words[wordIndex];

                //doesn't count -- before start word
                if(lineNum === phrase.startLine && word.wordNum < phrase.startWord) continue;
                //doesn't count -- after end word
                if(lineNum === phrase.endLine && word.wordNum > phrase.endWord) continue;

                words.push(word.wordId);
            }
        }
        return words;
    }

    this.checkLineEmpty = function(wordArray)
    {
        for(var i = 0; i < wordArray.length; i++) {
           if(wordArray[i].trim().length > 0) return false;
        }
        return true;
    };


    this.createElements = function() {
        var $formatted, $graph, $graphWords, $graphLabels, $graphContainer, $audioPlayers, $poemInfo;

        $poemContainer.addClass('pc-container');
        //set up format to contain formatted poem text
        $formatted = $('<div class="pc-formatted"/>');

        //set up graph to contain graph of phrases
        $graph = $('<div class="pc-graph"/>');
        $graph.css('height', recordings.length + 'em');

        //set up the graph word line
        $graphWords = $('<div class="pc-graph-words"/>');
        $graph.append($graphWords);

        //set up the recording controls
        $graphLabels = $('<div class="pc-graph-labels"/>');
        $graphLabels.append('<div class="pc-graph-label">Summary</div>');


        $audioPlayers = $('<div class="pc-audio-players"></div>');

        //set up a line for each recording
        var $graphRecordingWords = {};
        for(var recordingName in recordings) {

            var $recordingControl = $('<div class="pc-graph-label"></div>');


            var $playButton = $('<div class="pc-play-button pc-paused">&#9654;</div>');
            $playButton.attr('data-recording-name',recordingName);
            $recordingControl.append($playButton);

            $recordingControl.append('<div class="pc-recording-label">' + recordingName + '</div>');

            $graphLabels.append($recordingControl);

            $graph.append(this.createRecordingGraphElement(recordingName));
            $audioPlayers.append(this.createAudioPlayerRecordingElement(recordingName));
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
                        $word.attr('data-word-id', word.wordId);
                        $word.addClass(getCorrelationClass(word));
                        $word.attr('data-word-id', word.wordId);
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

        $poemInfo = ($('<div class="pc-info"/>'));
        $graphContainer = ($('<div class="pc-graph-container"></div>'));
        $graphContainer.append($graphLabels);
        $graphContainer.append($graph);
        $poemInfo.append($graphContainer);
        $poemInfo.append('<div class="pc-play-options"><input type="checkbox" class="pc-play-option-pause" />Pause after selected phrase played</div>');
        $poemInfo.append($audioPlayers);
        $poemContainer.append($poemInfo);
        $poemContainer.append($formatted);
    };

    /**
     * Function to create the phrase graph line for an individual recording
     * @param recordingName
     * @returns {*|HTMLElement}
     */
    this.createRecordingGraphElement = function(recordingName)
    {
        var $recordingGraph, $phrase, $word, recording, phrase, word, tempo, duration;

        $recordingGraph = $('<div class="pc-recording-graph"/>');
        $recordingGraph.attr('data-recording-name', recordingName);

        recording = recordings[recordingName];
        for(phraseId in recording.phrases) {
            phrase = poemPhrases[phraseId];
            $phrase = $('<div class="pc-recording-phrase"></div>');
            $phrase.attr('data-phrase-id', phraseId);
            $phrase.attr('data-recording-name', recordingName);
            $phrase.addClass(this.getRecordingPhraseCorrelationClass(recordingName, phraseId))

            for(var i in phrase.words) {
                word = poemWords[phrase.words[i]];
                $word = $("<div class='pc-word'/>");
                $word.html(word.text);
                $word.attr('data-word-id', word.wordId);
                $word.addClass(getRecordingCorrelationClass(recordingName, word));
                if(word.lineNum === phrase.startLine && word.wordNum === phrase.startWord) {
                    $word.addClass('pc-phrase-first-word');
                }
                if(word.lineNum === phrase.endLine && word.wordNum === phrase.endWord) {
                    $word.addClass('pc-phrase-last-word');
                }
                $phrase.append($word);
            }

            tempo = Math.round(10 *poemPhrases[phraseId].numWords / recording.phrases[phraseId].duration) /10;
            $phrase.append('<div class="pc-tempo">t:' + tempo.toString() + '</div>');
            $recordingGraph.append($phrase);
        }


        return $recordingGraph
    }


    /**
     * Function to create a recording audio element
     * @param recordingName
     */
    this.createAudioPlayerRecordingElement = function(recordingName)
    {
        var $audio, $audioDiv;
        //create an audio div container
        $audioDiv = $('<div class="pc-audio-player-recording"></div>');
        $audioDiv.attr('data-recording-name', recordingName);
        $audioDiv.append('<div class="pc-audio-player-label">Playing: ' + recordingName + '</div>');
        $audioDiv.hide();

        //create the audio element
        $audio = $('<audio class="pc-audio-element"/>');
        $audio.attr('controls', 'controls');
        $audio.attr('src', recordings[recordingName].url);
        $audio.attr('data-recording-name', recordingName);

        $audioDiv.prepend($audio);

        return $audioDiv;
    }
    /**
     * Function to get the correlation class of a word
     * @param word
     * @returns String
     */
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

    /**
     * Returns the class name representing the correleation of the given word for the given recording
     * @param recordingName
     * @param word
     * @returns {*}
     */
    this.getRecordingCorrelationClass = function(recordingName, word) {
        var phrase = this.getRecordingWordPhrase(recordingName, word);
        return this.getRecordingPhraseCorrelationClass(recordingName, phrase.id);

    }

    this.getRecordingPhraseCorrelationClass = function(recordingName, phraseId)
    {
        var phrase = poemPhrases[phraseId];
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
    };

    /**
     * Convert time to seconds
     * @param time
     * @returns {*}
     */
    this.timeToSeconds = function(time)
    {
        if(toString.call(time) == '[object Number]') {
            return time;
        }
        if(time.indexOf(":") > -1) {
            var timeParts = time.split(":");
            return parseFloat(timeParts[0]) * 60 + parseFloat(timeParts[1]);
        }
        return parseFloat(time);
    };

    /**
     *
     * @param recordingName
     * @param startTime
     * @param endTime
     */
    this.play = function(recordingName, startTime, endTime)
    {
        var $audio, $playButton, clipDuration;
        this.pauseAll();
        $('.pc-audio-player-recording').hide();

        $playButton = $('.pc-play-button[data-recording-name="' + recordingName + '"]');
        $playButton.addClass('pc-playing').html('&#10073;&#10073;');

        //show the audio div
        $('.pc-audio-player-recording[data-recording-name="' + recordingName +'"]').show();

        $audio = $('audio[data-recording-name="' + recordingName + '"]');
        if(startTime) {
            $audio[0].currentTime = this.timeToSeconds(startTime);
        }
        if(endTime && this.timeToSeconds(endTime) > 0) {
            clipDuration = 1000 * (this.timeToSeconds(endTime) - this.timeToSeconds(startTime));

            //todo Create a functio to make sure this hasn't been cancelled
            this.timeOut = setTimeout(this.pauseAll, clipDuration);
        }
        $audio[0].play();
    };



    /**
     * Pause all tracks
     */
    this.pauseAll = function()
    {
        clearTimeout(this.timeOut);
        $('.pc-play-button')
            .addClass('pc-paused')
            .removeClass('pc-playing')
            .html('&#9654;');
        $('audio').each(function() {
            $(this)[0].pause();
        })

    }
    this.playButtonClicked = function(recordingName) {
        var $audio = $('audio[data-recording-name="' + recordingName + '"]');
        if($audio.prop('paused')) {
            this.play(recordingName);
        }
        else {
            this.pauseAll();
        }

    };

    /**
     * Function to run when th
     * @param wordId
     */
    this.graphPhraseClicked = function(phraseId, recordingName) {
        var startTime = recordings[recordingName].phrases[phraseId].startTime;
        var endTime = recordings[recordingName].phrases[phraseId].endTime;

        var $optionPause = $('.pc-play-option-pause');
        if($optionPause.prop('checked')) {
            this.play(recordingName, startTime, endTime);
        }
        else {
            this.play(recordingName, startTime);
        }
    }

    /**
     * Function to run when a word is clicked on
     * @param wordId
     */
    this.formattedWordClicked = function(wordId) {
        var $firstWord, $summaryWord, $graph;

        $firstWord = $('.pc-graph-words').first();
        //find the first word
        $summaryWord =  $('.pc-graph-words div.pc-word[data-word-id="' + wordId + '"]');
        $graph = $('.pc-graph');
        $graph.scrollLeft($summaryWord.position().left - $firstWord.position().left );

    };

    this.onResize = function() {
        var $graph;
        //set the poem container to fill up the remainder of the screen
        $poemContainer.height($(window).height() - $poemContainer.offset().top);
        $poemContainer.width($(window).width());

        $graph = $('.pc-graph');
        $graph.width($(window).width() - $graph.offset().left);

        $
        //$('.pc-graph').width($(window).width() - $('.pc-graph').offset().left);
    }
    /**
     * Initialize the correlator
     * @param options
     * - poemTextCsvUrl:    (required) The url of the csv file containing the poem text
     * - poemPhrasesCsvUrl: (required) The url of the csv file containing the poem phrases
     * - poemContainer:    (required) jQuery object of the poem container
     */
    this.init = function(options)
    {
        this.timeOut = -1;
        parsePoemTextFromCsvUrl(options.poemTextCsvUrl);
        parsePoemPhrasesFromCsvUrl(options.poemPhrasesCsvUrl);
        $poemContainer = options.poemContainer;

        //add word click listener
        $poemContainer.on('click', '.pc-formatted .pc-word', function() {
            formattedWordClicked($(this).attr('data-word-id'));
        });

        $poemContainer.on('click', '.pc-play-button', function() {
            playButtonClicked($(this).attr('data-recording-name'));
        });

        $poemContainer.on('click', '.pc-recording-phrase', function() {
            var $this = $(this);
            graphPhraseClicked($this.attr('data-phrase-id'), $this.attr('data-recording-name'));
        })


        $(window).resize(function() {onResize()});


    };

    window.phraseCorrelator = {
        init: this.init,
        getPoemLines: function() { return poemLines;}
    };
})(window, jQuery);