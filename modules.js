const ModuleComponents = [
    {
        id: "BigButton",
        config: {
            RequiresTimerVisibility: true
        },
        create: function (module, selects, get, debug) {
            //            0: blue,   1: red,    2: yellow, 3: white
            var colors = ["#5599ff", "#ff5555", "#ffdd55", "#ececec"];
            var stripnumbers = [4, 1, 5, 1];
            //          0: Abort, 1: Hold, 2: Press, 3: Detonate
            var texts = ["ABORT", "HOLD", "PRESS", "DETONATE"];


            var color = Math.floor(Math.random() * colors.length);
            var text = Math.floor(Math.random() * texts.length);


            var testColor = (i) => color == i;
            var testText = (i) => text == i;
            var rules = [
                [testColor(0) && testText(0), "hold"],
                [BombInfo.GetBatteryCount() > 1 && testText(3), "press"],
                [testColor(3) && BombInfo.IsIndicatorOn("CAR"), "hold"],
                [BombInfo.GetBatteryCount() > 2 && BombInfo.IsIndicatorOn("FRK"), "press"],
                [testColor(2), "hold"],
                [testColor(1) && testText(1), "press"]
            ];


            var ButtonSelectable = selects.button;
            ButtonSelectable.element.css({ fill: colors[color] });
            var isholding = false;
            var holdTimeout = null;
            var stripcolor = null;
            var stripanim = null;
            ButtonSelectable.OnInteract = () => {
                holdTimeout = setTimeout(() => {
                    isholding = true;
                    ispressing = false;
                    stripcolor = Math.floor(Math.random() * colors.length);
                    get(".color-strip").css({ fill: colors[stripcolor] });
                    stripanim = anime({
                        targets: get(".color-strip")[0],
                        keyframes: [
                            { opacity: 1, duration: 0 },
                            { opacity: 0.7, duration: 2000 },
                            { opacity: 1, duration: 2000 }
                        ],
                        easing: "easeInOutSine",
                        loop: true
                    });
                    debug.log("Holding button...");
                }, 500);
            };
            ButtonSelectable.OnInteractEnded = () => {
                clearTimeout(holdTimeout);
                if (stripanim) stripanim.pause();
                if (isholding) debug.log("Released after hold, timer time is %s", BombInfo.GetFormattedTime());
                else debug.log("Released after press");
                var applicableRule = rules.find((r) => r[0]);
                var action = applicableRule ? applicableRule[1] : "hold";
                if (isholding && action == "press" || !isholding && action == "hold") {
                    module.HandleStrike();
                } else if (isholding && action == "hold") {
                    if (BombInfo.GetFormattedTime().includes(stripnumbers[stripcolor])) {
                        module.HandlePass();
                    } else {
                        module.HandleStrike();
                    }
                } else if (!isholding && action == "press") {
                    module.HandlePass();
                }
                isholding = false;
                stripcolor = null;
                get(".color-strip").css({ fill: "#000000" });
            };
            get(".button-text").html(texts[text]);
        }
    },
    {
        id: "SimpleButton",
        create: function (module, selects, get, debug) {
            get(".simpleton-text-2").hide();
            var issolved = false;
            selects.button.OnInteract = () => {
                //if (issolved) return;
                issolved = true;
                //module.HandlePass();
                module.HandleStrike();
                get(".simpleton-text-1").hide();
                get(".simpleton-text-2").show();
            };
        }
    },
    {
        id: "Wires",
        create: function (module, selects, get, debug) {
            //             0: red, 1: blue, 2: yellow, 3: black, 4: white
            var wirecolors = ["#f33", "#33f", "#cc3", "#333", "#ccc"];
            var wires = [];
            var numWires = Math.floor(Math.random() * 4) + 3;
            for (var x = 0; x < 6; x++) {
                var c = Math.floor(Math.random() * wirecolors.length);
                var w = selects["wire-" + x];
                w.element.css({ strokeWidth: 8, stroke: wirecolors[c] });
                wires.push({ c, w });
            }
            var removableWires = [].concat(wires);
            for (var x = 0; x < 6 - numWires; x++) {
                var i = Math.floor(Math.random() * removableWires.length);
                removableWires[i].w.element.remove();
                removableWires[i].w.remove();
                removableWires.splice(i, 1);
            }

            var wiresc = removableWires.map((r) => r.c);
            var colorCount = (c) => wiresc.filter((w) => w == c).length;
            var isColor = (i, c) => wiresc[i] === c;
            var serialNumberDigits = BombInfo.GetSerialNumber().split("");
            var lastDigit = serialNumberDigits[serialNumberDigits.length - 1];
            var lastDigitIsOdd = lastDigit % 2 != 0;
            var rules = [
                [
                    [!colorCount(0), 1],
                    [isColor(2, 4), 2],
                    [colorCount(1) > 1, wiresc.lastIndexOf(1)],
                    [true, 2]
                ],
                [
                    [colorCount(0) > 1 && lastDigitIsOdd, wiresc.lastIndexOf(0)],
                    [isColor(3, 2) && !colorCount(0), 0],
                    [colorCount(1) == 1, 0],
                    [colorCount(2) > 1, 3],
                    [true, 0]
                ],
                [
                    [isColor(4, 3) && lastDigitIsOdd, 3],
                    [colorCount(0) == 1 && colorCount(2) > 1, 0],
                    [!colorCount(3), 1],
                    [true, 0]
                ],
                [
                    [!colorCount(2) && lastDigitIsOdd, 2],
                    [colorCount(2) == 1 && colorCount(4) > 1, 3],
                    [!colorCount(0), 5],
                    [true, 3]
                ]
            ];
            var ruleset = rules[numWires - 3];
            debug.log("%o", ruleset);
            var rule = ruleset.find((r) => r[0]);
            var wireToCut = rule[1];
            removableWires.forEach((w, i) => {
                w.w.OnInteract = () => {
                    w.w.element.remove();
                    w.w.remove();
                    debug.log("Wire %i cut, %i expected", i, wireToCut);
                    if (i == wireToCut) module.HandlePass();
                    else module.HandleStrike();
                };
            });
        }
    },
    {
        id: "Memory",
        create: function (module, selects, get, debug) {
            var canInteract = false;
            var currentStage = 0;
            var currentDisplay = null;
            var currentButtons = [];
            var pressed = [];
            var setDisplay = (h) => {
                get(".display").html(h ? "" : currentDisplay);
            };
            var setButtons = (h) => {
                currentButtons.forEach((b, i) => {
                    get(".button-" + (i + 1)).html(h ? "" : b);
                });
            };
            var setStageDisplay = () => {
                get("[data-stage]").each((_, e) => {
                    var u = $(e);
                    if (u.data("stage") <= currentStage) u.show();
                    else u.hide();
                });
            };
            setDisplay(true);
            setButtons(true);
            setStageDisplay();
            var initStage = () => {
                currentDisplay = Math.floor(Math.random() * 4) + 1;
                currentButtons = [];
                var possibleButtons = [1, 2, 3, 4];
                for (var x = 0; x < 4; x++) {
                    var i = Math.floor(Math.random() * possibleButtons.length);
                    currentButtons.push(possibleButtons[i]);
                    possibleButtons.splice(i, 1);
                }
                setButtons();
                setTimeout(() => {
                    setDisplay();
                    canInteract = true;
                }, 750);
            };
            initStage();
            var addinteract = (x) => {
                selects["button-" + (x + 1)].OnInteract = () => {
                    if (!canInteract) return;
                    canInteract = false;
                    pressed.push([x + 1, currentButtons[x]]);
                    var rules = [
                        [
                            { position: 2 },
                            { position: 2 },
                            { position: 3 },
                            { position: 4 }
                        ],
                        [
                            { label: 4 },
                            { stage: 1, get: 0 },
                            { position: 1 },
                            { stage: 1, get: 0 }
                        ],
                        [
                            { stage: 2, get: 1 },
                            { stage: 1, get: 1 },
                            { position: 3 },
                            { label: 4 }
                        ],
                        [
                            { stage: 1, get: 0 },
                            { position: 1 },
                            { stage: 2, get: 0 },
                            { stage: 2, get: 0 }
                        ],
                        [
                            { stage: 1, get: 1 },
                            { stage: 2, get: 1 },
                            { stage: 4, get: 1 },
                            { stage: 3, get: 1 }
                        ]
                    ];
                    var ruleset = rules[currentStage];
                    var rule = ruleset[currentDisplay - 1];
                    var correctPosition = rule.position ? rule.position : rule.label ? currentButtons.indexOf(rule.label) + 1 : rule.get == 1 ? currentButtons.indexOf(pressed[rule.stage - 1][1]) + 1 : pressed[rule.stage - 1][0];
                    var pressedPosition = x + 1;
                    var doNext = () => {
                        setDisplay(true);
                        setStageDisplay();
                        setTimeout(() => {
                            setButtons(true);
                            setTimeout(() => initStage(), 250);
                        }, 750);
                    };
                    if (correctPosition == pressedPosition) {
                        if (currentStage == 4) {
                            module.HandlePass();
                            currentStage++;
                            setDisplay(true);
                            setStageDisplay();
                            setTimeout(() => {
                                setButtons(true);
                            }, 750);
                        } else {
                            currentStage++;
                            doNext();
                        }
                    } else {
                        module.HandleStrike();
                        currentStage = 0;
                        pressed = [];
                        doNext();
                    }
                };
            };
            for (var x = 0; x < 4; x++) addinteract(x);
        }
    },
    {
        id: "WhosOnFirst",
        create: function (module, selects, get, debug) {
            var step1 = { DISPLAY1: 2, DISPLAY2: 1, DISPLAY3: 5, DISPLAY4: 1, DISPLAY5: 5, DISPLAY6: 2, DISPLAY7: 3, DISPLAY9: 5, DISPLAY10: 2, DISPLAY11: 5, DISPLAY12: 3, DISPLAY13: 3, DISPLAY14: 4, DISPLAY15: 4, DISPLAY16: 5, DISPLAY17: 3, DISPLAY18: 5, DISPLAY19: 3, DISPLAY20: 3, DISPLAY21: 0, DISPLAY22: 5, DISPLAY23: 4, DISPLAY24: 3, DISPLAY25: 2, DISPLAY26: 5, DISPLAY27: 1, DISPLAY28: 5 };
            var step2 = { KEYPAD_group1_1: ["KEYPAD_group1_6", "KEYPAD_group1_12", "KEYPAD_group1_7", "KEYPAD_group1_11", "KEYPAD_group1_9", "KEYPAD_group1_14", "KEYPAD_group1_10", "KEYPAD_group1_4", "KEYPAD_group1_1", "KEYPAD_group1_3", "KEYPAD_group1_2", "KEYPAD_group1_8", "KEYPAD_group1_5", "KEYPAD_group1_13"], KEYPAD_group1_2: ["KEYPAD_group1_9", "KEYPAD_group1_12", "KEYPAD_group1_6", "KEYPAD_group1_11", "KEYPAD_group1_3", "KEYPAD_group1_10", "KEYPAD_group1_5", "KEYPAD_group1_8", "KEYPAD_group1_13", "KEYPAD_group1_1", "KEYPAD_group1_4", "KEYPAD_group1_7", "KEYPAD_group1_14", "KEYPAD_group1_2"], KEYPAD_group1_3: ["KEYPAD_group1_4", "KEYPAD_group1_8", "KEYPAD_group1_13", "KEYPAD_group1_2", "KEYPAD_group1_7", "KEYPAD_group1_1", "KEYPAD_group1_10", "KEYPAD_group1_6", "KEYPAD_group1_5", "KEYPAD_group1_9", "KEYPAD_group1_14", "KEYPAD_group1_12", "KEYPAD_group1_3", "KEYPAD_group1_11"], KEYPAD_group1_4: ["KEYPAD_group1_13", "KEYPAD_group1_10", "KEYPAD_group1_12", "KEYPAD_group1_11", "KEYPAD_group1_4", "KEYPAD_group1_14", "KEYPAD_group1_1", "KEYPAD_group1_5", "KEYPAD_group1_3", "KEYPAD_group1_7", "KEYPAD_group1_9", "KEYPAD_group1_8", "KEYPAD_group1_6", "KEYPAD_group1_2"], KEYPAD_group1_5: ["KEYPAD_group1_8", "KEYPAD_group1_10", "KEYPAD_group1_12", "KEYPAD_group1_11", "KEYPAD_group1_6", "KEYPAD_group1_4", "KEYPAD_group1_3", "KEYPAD_group1_14", "KEYPAD_group1_9", "KEYPAD_group1_7", "KEYPAD_group1_13", "KEYPAD_group1_2", "KEYPAD_group1_5", "KEYPAD_group1_1"], KEYPAD_group1_6: ["KEYPAD_group1_12", "KEYPAD_group1_10", "KEYPAD_group1_8", "KEYPAD_group1_11", "KEYPAD_group1_2", "KEYPAD_group1_7", "KEYPAD_group1_14", "KEYPAD_group1_1", "KEYPAD_group1_5", "KEYPAD_group1_6", "KEYPAD_group1_9", "KEYPAD_group1_4", "KEYPAD_group1_3", "KEYPAD_group1_13"], KEYPAD_group1_7: ["KEYPAD_group1_8", "KEYPAD_group1_7", "KEYPAD_group1_9", "KEYPAD_group1_5", "KEYPAD_group1_1", "KEYPAD_group1_4", "KEYPAD_group1_11", "KEYPAD_group1_3", "KEYPAD_group1_12", "KEYPAD_group1_2", "KEYPAD_group1_13", "KEYPAD_group1_6", "KEYPAD_group1_14", "KEYPAD_group1_10"], KEYPAD_group1_8: ["KEYPAD_group1_1", "KEYPAD_group1_5", "KEYPAD_group1_9", "KEYPAD_group1_7", "KEYPAD_group1_12", "KEYPAD_group1_6", "KEYPAD_group1_10", "KEYPAD_group1_3", "KEYPAD_group1_14", "KEYPAD_group1_4", "KEYPAD_group1_8", "KEYPAD_group1_11", "KEYPAD_group1_13", "KEYPAD_group1_2"], KEYPAD_group1_9: ["KEYPAD_group1_10", "KEYPAD_group1_9", "KEYPAD_group1_2", "KEYPAD_group1_3", "KEYPAD_group1_11", "KEYPAD_group1_6", "KEYPAD_group1_4", "KEYPAD_group1_7", "KEYPAD_group1_8", "KEYPAD_group1_13", "KEYPAD_group1_14", "KEYPAD_group1_1", "KEYPAD_group1_12", "KEYPAD_group1_5"], KEYPAD_group1_10: ["KEYPAD_group1_6", "KEYPAD_group1_5", "KEYPAD_group1_1", "KEYPAD_group1_14", "KEYPAD_group1_3", "KEYPAD_group1_13", "KEYPAD_group1_7", "KEYPAD_group1_10", "KEYPAD_group1_11", "KEYPAD_group1_9", "KEYPAD_group1_8", "KEYPAD_group1_4", "KEYPAD_group1_12", "KEYPAD_group1_2"], KEYPAD_group1_11: ["KEYPAD_group1_4", "KEYPAD_group1_1", "KEYPAD_group1_12", "KEYPAD_group1_7", "KEYPAD_group1_5", "KEYPAD_group1_14", "KEYPAD_group1_3", "KEYPAD_group1_13", "KEYPAD_group1_9", "KEYPAD_group1_11", "KEYPAD_group1_10", "KEYPAD_group1_2", "KEYPAD_group1_8", "KEYPAD_group1_6"], KEYPAD_group1_12: ["KEYPAD_group1_11", "KEYPAD_group1_3", "KEYPAD_group1_2", "KEYPAD_group1_6", "KEYPAD_group1_8", "KEYPAD_group1_5", "KEYPAD_group1_13", "KEYPAD_group1_12", "KEYPAD_group1_9", "KEYPAD_group1_1", "KEYPAD_group1_4", "KEYPAD_group1_14", "KEYPAD_group1_7", "KEYPAD_group1_10"], KEYPAD_group1_13: ["KEYPAD_group1_8", "KEYPAD_group1_3", "KEYPAD_group1_4", "KEYPAD_group1_12", "KEYPAD_group1_6", "KEYPAD_group1_9", "KEYPAD_group1_2", "KEYPAD_group1_14", "KEYPAD_group1_7", "KEYPAD_group1_13", "KEYPAD_group1_5", "KEYPAD_group1_1", "KEYPAD_group1_10", "KEYPAD_group1_11"], KEYPAD_group1_14: ["KEYPAD_group1_10", "KEYPAD_group1_11", "KEYPAD_group1_6", "KEYPAD_group1_1", "KEYPAD_group1_14", "KEYPAD_group1_12", "KEYPAD_group1_5", "KEYPAD_group1_8", "KEYPAD_group1_4", "KEYPAD_group1_9", "KEYPAD_group1_2", "KEYPAD_group1_7", "KEYPAD_group1_3", "KEYPAD_group1_13"], KEYPAD_group2_1: ["KEYPAD_group2_13", "KEYPAD_group2_2", "KEYPAD_group2_3", "KEYPAD_group2_4", "KEYPAD_group2_11", "KEYPAD_group2_7", "KEYPAD_group2_5", "KEYPAD_group2_12", "KEYPAD_group2_9", "KEYPAD_group2_1", "KEYPAD_group2_8", "KEYPAD_group2_14", "KEYPAD_group2_10", "KEYPAD_group2_6"], KEYPAD_group2_2: ["KEYPAD_group2_3", "KEYPAD_group2_11", "KEYPAD_group2_14", "KEYPAD_group2_7", "KEYPAD_group2_9", "KEYPAD_group2_10", "KEYPAD_group2_8", "KEYPAD_group2_12", "KEYPAD_group2_1", "KEYPAD_group2_6", "KEYPAD_group2_4", "KEYPAD_group2_13", "KEYPAD_group2_5", "KEYPAD_group2_2"], KEYPAD_group2_3: ["KEYPAD_group2_8", "KEYPAD_group2_2", "KEYPAD_group2_7", "KEYPAD_group2_3", "KEYPAD_group2_11", "KEYPAD_group2_5", "KEYPAD_group2_13", "KEYPAD_group2_6", "KEYPAD_group2_4", "KEYPAD_group2_1", "KEYPAD_group2_9", "KEYPAD_group2_12", "KEYPAD_group2_14", "KEYPAD_group2_10"], KEYPAD_group2_4: ["KEYPAD_group2_1", "KEYPAD_group2_4", "KEYPAD_group2_5", "KEYPAD_group2_11", "KEYPAD_group2_8", "KEYPAD_group2_2", "KEYPAD_group2_6", "KEYPAD_group2_3", "KEYPAD_group2_9", "KEYPAD_group2_7", "KEYPAD_group2_13", "KEYPAD_group2_10", "KEYPAD_group2_14", "KEYPAD_group2_12"], KEYPAD_group2_5: ["KEYPAD_group2_10", "KEYPAD_group2_6", "KEYPAD_group2_5", "KEYPAD_group2_7", "KEYPAD_group2_9", "KEYPAD_group2_13", "KEYPAD_group2_3", "KEYPAD_group2_12", "KEYPAD_group2_4", "KEYPAD_group2_14", "KEYPAD_group2_11", "KEYPAD_group2_8", "KEYPAD_group2_2", "KEYPAD_group2_1"], KEYPAD_group2_6: ["KEYPAD_group2_7", "KEYPAD_group2_13", "KEYPAD_group2_11", "KEYPAD_group2_9", "KEYPAD_group2_4", "KEYPAD_group2_5", "KEYPAD_group2_8", "KEYPAD_group2_10", "KEYPAD_group2_6", "KEYPAD_group2_1", "KEYPAD_group2_14", "KEYPAD_group2_12", "KEYPAD_group2_2", "KEYPAD_group2_3"], KEYPAD_group2_7: ["KEYPAD_group2_7", "KEYPAD_group2_3", "KEYPAD_group2_2", "KEYPAD_group2_1", "KEYPAD_group2_10", "KEYPAD_group2_12", "KEYPAD_group2_8", "KEYPAD_group2_11", "KEYPAD_group2_13", "KEYPAD_group2_14", "KEYPAD_group2_4", "KEYPAD_group2_5", "KEYPAD_group2_6", "KEYPAD_group2_9"], KEYPAD_group2_8: ["KEYPAD_group2_5", "KEYPAD_group2_6", "KEYPAD_group2_2", "KEYPAD_group2_4", "KEYPAD_group2_11", "KEYPAD_group2_8", "KEYPAD_group2_10", "KEYPAD_group2_1", "KEYPAD_group2_7", "KEYPAD_group2_14", "KEYPAD_group2_3", "KEYPAD_group2_13", "KEYPAD_group2_12", "KEYPAD_group2_9"], KEYPAD_group2_9: ["KEYPAD_group2_1", "KEYPAD_group2_12", "KEYPAD_group2_4", "KEYPAD_group2_3", "KEYPAD_group2_6", "KEYPAD_group2_10", "KEYPAD_group2_8", "KEYPAD_group2_14", "KEYPAD_group2_2", "KEYPAD_group2_7", "KEYPAD_group2_5", "KEYPAD_group2_11", "KEYPAD_group2_9", "KEYPAD_group2_13"], KEYPAD_group2_10: ["KEYPAD_group2_13", "KEYPAD_group2_7", "KEYPAD_group2_11", "KEYPAD_group2_9", "KEYPAD_group2_3", "KEYPAD_group2_5", "KEYPAD_group2_4", "KEYPAD_group2_12", "KEYPAD_group2_14", "KEYPAD_group2_1", "KEYPAD_group2_6", "KEYPAD_group2_2", "KEYPAD_group2_8", "KEYPAD_group2_10"], KEYPAD_group2_11: ["KEYPAD_group2_9", "KEYPAD_group2_7", "KEYPAD_group2_8", "KEYPAD_group2_3", "KEYPAD_group2_12", "KEYPAD_group2_13", "KEYPAD_group2_11", "KEYPAD_group2_14", "KEYPAD_group2_10", "KEYPAD_group2_2", "KEYPAD_group2_5", "KEYPAD_group2_4", "KEYPAD_group2_6", "KEYPAD_group2_1"], KEYPAD_group2_12: ["KEYPAD_group2_2", "KEYPAD_group2_6", "KEYPAD_group2_10", "KEYPAD_group2_8", "KEYPAD_group2_1", "KEYPAD_group2_5", "KEYPAD_group2_13", "KEYPAD_group2_9", "KEYPAD_group2_4", "KEYPAD_group2_11", "KEYPAD_group2_12", "KEYPAD_group2_7", "KEYPAD_group2_3", "KEYPAD_group2_14"], KEYPAD_group2_13: ["KEYPAD_group2_2", "KEYPAD_group2_10", "KEYPAD_group2_14", "KEYPAD_group2_4", "KEYPAD_group2_1", "KEYPAD_group2_12", "KEYPAD_group2_7", "KEYPAD_group2_5", "KEYPAD_group2_13", "KEYPAD_group2_6", "KEYPAD_group2_9", "KEYPAD_group2_11", "KEYPAD_group2_3", "KEYPAD_group2_8"], KEYPAD_group2_14: ["KEYPAD_group2_4", "KEYPAD_group2_11", "KEYPAD_group2_6", "KEYPAD_group2_5", "KEYPAD_group2_12", "KEYPAD_group2_10", "KEYPAD_group2_8", "KEYPAD_group2_9", "KEYPAD_group2_7", "KEYPAD_group2_1", "KEYPAD_group2_14", "KEYPAD_group2_13", "KEYPAD_group2_2", "KEYPAD_group2_3"] };
            var strings = { DISPLAY1: "YES", DISPLAY2: "FIRST", DISPLAY3: "DISPLAY", DISPLAY4: "OKAY", DISPLAY5: "SAYS", DISPLAY6: "NOTHING", DISPLAY7: "", DISPLAY8: "BLANK", DISPLAY9: "NO", DISPLAY10: "LED", DISPLAY11: "LEAD", DISPLAY12: "READ", DISPLAY13: "RED", DISPLAY14: "REED", DISPLAY15: "LEED", DISPLAY16: "HOLD ON", DISPLAY17: "YOU", DISPLAY18: "YOU ARE", DISPLAY19: "YOUR", DISPLAY20: "YOU'RE", DISPLAY21: "UR", DISPLAY22: "THERE", DISPLAY23: "THEY'RE", DISPLAY24: "THEIR", DISPLAY25: "THEY ARE", DISPLAY26: "SEE", DISPLAY27: "C", DISPLAY28: "CEE", KEYPAD_group1_1: "READY", KEYPAD_group1_2: "FIRST", KEYPAD_group1_3: "NO", KEYPAD_group1_4: "BLANK", KEYPAD_group1_5: "NOTHING", KEYPAD_group1_6: "YES", KEYPAD_group1_7: "WHAT", KEYPAD_group1_8: "UHHH", KEYPAD_group1_9: "LEFT", KEYPAD_group1_10: "RIGHT", KEYPAD_group1_11: "MIDDLE", KEYPAD_group1_12: "OKAY", KEYPAD_group1_13: "WAIT", KEYPAD_group1_14: "PRESS", KEYPAD_group2_1: "YOU", KEYPAD_group2_2: "YOU ARE", KEYPAD_group2_3: "YOUR", KEYPAD_group2_4: "YOU'RE", KEYPAD_group2_5: "UR", KEYPAD_group2_6: "U", KEYPAD_group2_7: "UH HUH", KEYPAD_group2_8: "UH UH", KEYPAD_group2_9: "WHAT?", KEYPAD_group2_10: "DONE", KEYPAD_group2_11: "NEXT", KEYPAD_group2_12: "HOLD", KEYPAD_group2_13: "SURE", KEYPAD_group2_14: "LIKE" };


            var canInteract = false;
            var currentStage = 0;
            var currentDisplay = null;
            var currentButtons = [];
            var correctIndex = null;
            var setDisplay = (h) => {
                get("[data-wof-text=display]").html(h ? "" : strings[currentDisplay]);
                currentButtons.forEach((b, i) => {
                    get("[data-wof-text=" + (i + 1) + "]").html(strings[b]);
                });
                if (h) {
                    for (var i = 0; i < 6; i++) {
                        get("[data-wof-text=" + (i + 1) + "]").html("");
                    }
                }
            };
            var setStageDisplay = () => {
                get("[data-stage]").each((_, e) => {
                    var u = $(e);
                    if (u.data("stage") <= currentStage) u.show();
                    else u.hide();
                });
            };
            setDisplay(true);
            setStageDisplay();
            var initStage = () => {
                var group = Math.floor(Math.random() * 2) + 1;
                currentDisplay = Object.keys(step1)[Math.floor(Math.random() * Object.keys(step1).length)];
                currentButtons = [];
                var availableButtons = [];
                for (var x = 0; x < 14; x++) availableButtons.push("KEYPAD_group" + group + "_" + (x + 1));
                for (var x = 0; x < 6; x++) {
                    var i = Math.floor(Math.random() * availableButtons.length);
                    currentButtons.push(availableButtons[i]);
                    availableButtons.splice(i, 1);
                }
                var currentList = step2[currentButtons[step1[currentDisplay]]];
                correctIndex = currentButtons.indexOf(currentList.find((a) => currentButtons.includes(a)));
                setTimeout(() => {
                    setDisplay();
                    canInteract = true;
                }, 1000);
            };
            initStage();
            var addinteract = (x) => {
                selects["button-" + (x + 1)].OnInteract = () => {
                    if (!canInteract) return;
                    canInteract = false;
                    if (x == correctIndex) {
                        if (currentStage == 2) {
                            module.HandlePass();
                            currentStage++;
                            setStageDisplay();
                            setTimeout(() => {
                                setDisplay(true);
                            }, 1000);
                        } else {
                            currentStage++;
                            setStageDisplay();
                            setTimeout(() => {
                                setDisplay(true);
                                initStage();
                            }, 1000);
                        }
                    } else {
                        module.HandleStrike();
                        currentStage = 0;
                        setStageDisplay();
                        setTimeout(() => {
                            setDisplay(true);
                            initStage();
                        }, 1000);
                    }
                };
            };
            for (var x = 0; x < 6; x++) addinteract(x);
        }
    },
    {
        id: "Keypad",
        create: function (module, selects, get, debug) {
            var groups = [[28, 13, 30, 12, 7, 9, 23], [16, 28, 23, 26, 3, 9, 20], [1, 8, 26, 5, 15, 30, 3], [11, 21, 31, 7, 5, 20, 4], [24, 4, 31, 22, 21, 19, 2], [11, 16, 27, 14, 24, 18, 6]];
            var w = get("metadata").parent().parent();
            var createSymbol = (i, number) => {
                var percentage = (number - 1) / 30 * 100;
                $("<div/>").css({
                    position: "absolute",
                    top: 72 + Math.floor(i / 2) * 70,
                    left: 33 + (i % 2) * 72,
                    width: 50,
                    height: 50,
                    backgroundImage: "url(images/modules/Keypad/symbols.png)",
                    backgroundSize: "100% auto",
                    backgroundPosition: "0 " + percentage + "%",
                    zIndex: 6
                }).appendTo(w);
            };
            var group = groups[Math.floor(Math.random() * groups.length)];
            var removalgroup = [].concat(group);
            var selectedsymbols = [];
            for (var i = 0; i < 4; i++) {
                var s = Math.floor(Math.random() * removalgroup.length);
                selectedsymbols.push(removalgroup[s]);
                createSymbol(i, removalgroup[s]);
                removalgroup.splice(s, 1);
            }
            debug.log("Selected symbols are: %s", selectedsymbols.join(", "));
            var numpressed = 0;
            var addinteract = (x) => {
                var pressed = false;
                selects["button-" + x].OnInteract = () => {
                    if (pressed) return;
                    var light = get("[data-light=" + x + "]");
                    var isCorrect = selectedsymbols[x] == [].concat(selectedsymbols).sort((a, b) => group.indexOf(a) - group.indexOf(b))[numpressed];
                    if (isCorrect) {
                        numpressed++;
                        pressed = true;
                        light.css({ fill: "#0e0" });
                        if (numpressed == 4) {
                            module.HandlePass();
                        }
                    } else {
                        light.css({ fill: "#e00" });
                        setTimeout(() => {
                            if (!pressed) light.css({ fill: "#000" });
                        }, 500);
                        module.HandleStrike();
                    }
                };
            };
            for (var x = 0; x < 4; x++) addinteract(x);
        }
    }
];