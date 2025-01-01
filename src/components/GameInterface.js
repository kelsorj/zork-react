import React, { useState, useEffect, useRef } from "react";
import gameData from "../data/game_data.json";
import "./GameInterface.css";

function GameInterface() {
  const [gameLog, setGameLog] = useState([]);
  const [input, setInput] = useState("");
  const [gameState, setGameState] = useState(() => {
    // Try to load saved game on initial load
    const savedGame = localStorage.getItem('zorkSaveGame');
    if (savedGame) {
      return JSON.parse(savedGame);
    }
    return {
      currentRoom: gameData.state.currentRoom,
      inventory: [],
      itemsInWorld: gameData.state.itemsInWorld,
      lockedDoors: gameData.state.lockedDoors,
      rugMoved: false
    };
  });
  const logRef = useRef(null);

  // Add state for game settings and last command
  const [gameSettings, setGameSettings] = useState({
    verbose: false,
    brief: true,
    superbrief: false,
    score: 0,
    health: 100,
    lastCommand: ""
  });

  // Add helper functions to get room descriptions
  const getBasicRoomDescription = (roomId) => {
    const room = gameData.rooms[roomId];
    return room.description;
  };

  const getRoomDescriptionWithItems = (roomId) => {
    const room = gameData.rooms[roomId];
    const roomItems = Object.entries(gameState.itemsInWorld)
      .filter(([item, location]) => location === roomId)
      .map(([item]) => item);

    let description = room.description;
    
    // If in living room and rug is moved, add trapdoor to description
    if (roomId === "living room" && gameState.rugMoved) {
      description = description.replace("A beautiful oriental rug lies in the center.", "A trapdoor is visible in the floor.");
    }
    
    if (roomItems.length > 0) {
      description += "\n\nYou can see: " + roomItems.join(", ") + " here.";
    }
    return description;
  };

  useEffect(() => {
    const initialRoom = gameData.rooms[gameState.currentRoom];
    setGameLog([
      "ZORK I: The Great Underground Empire",
      "Copyright (c) 1981, 1982, 1983 Infocom, Inc.",
      "All rights reserved.",
      "",
      getBasicRoomDescription(gameState.currentRoom)
    ]);
  }, [gameState.currentRoom]);

  useEffect(() => {
    // Scroll to bottom when log updates
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameLog]);

  const handleInput = (e) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const command = input.trim().toLowerCase();

    if (command) {
      setGameSettings(prev => ({
        ...prev,
        lastCommand: command
      }));
      processCommand(command);
      setInput("");
    }
  };

  const processCommand = (command) => {
    // Handle empty command
    if (!command) {
      setGameLog((prevLog) => [
        ...prevLog,
        ">",
        "I beg your pardon?"
      ]);
      return;
    }

    const words = command.toLowerCase().split(" ");
    const action = words[0];
    const target = words.slice(1).join(" ");

    // Handle directional shortcuts
    const directionMap = {
      'n': 'north',
      's': 'south',
      'e': 'east',
      'w': 'west',
      'ne': 'northeast',
      'nw': 'northwest',
      'se': 'southeast',
      'sw': 'southwest',
      'u': 'up',
      'd': 'down'
    };

    // Handle movement commands
    if (Object.keys(directionMap).includes(action) || 
        Object.values(directionMap).includes(action)) {
      const direction = directionMap[action] || action;
      handleGo(direction);
      return;
    }

    // Handle special commands
    switch (action) {
      case "go":
        handleGo(target);
        break;
      case "take":
        if (target.includes(" from ")) {
          const [item, _, container] = target.split(" from ");
          handleTakeFrom(item, container);
        } else if (target === "all") {
          handleTakeAll();
        } else {
          handleTake(target);
        }
        break;
      case "drop":
        handleDrop(target);
        break;
      case "inventory":
      case "i":
        handleInventory();
        break;
      case "look":
      case "l":
        handleLook();
        break;
      case "examine":
      case "x":
        handleExamine(target);
        break;
      case "read":
        handleRead(target);
        break;
      case "open":
        if (target === "trapdoor" && gameState.currentRoom === "living room") {
          if (!gameState.rugMoved) {
            setGameLog((prevLog) => [
              ...prevLog,
              `> open ${target}`,
              "The rug is covering the trapdoor. You'll need to move it first."
            ]);
            return;
          }
          setGameState((prevState) => ({
            ...prevState,
            trapdoorOpen: true
          }));
          setGameLog((prevLog) => [
            ...prevLog,
            `> open ${target}`,
            "The trapdoor opens, revealing a passage down into darkness."
          ]);
          return;
        } else if (target === "window" && gameState.currentRoom === "east of house") {
          setGameLog((prevLog) => [
            ...prevLog,
            `> open window`,
            "The window is already slightly open."
          ]);
          return;
        }

        const roomForOpen = gameData.rooms[gameState.currentRoom];
        const openAction = roomForOpen.actions["open"];
        if (openAction) {
          setGameLog((prevLog) => [
            ...prevLog,
            `> open ${target}`,
            openAction
          ]);
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            `> open ${target}`,
            `You can't open that.`
          ]);
        }
        break;
      case "close":
        handleClose(target);
        break;
      case "enter":
      case "in":
        if (gameState.currentRoom === "east of house") {
          setGameState((prevState) => ({
            ...prevState,
            currentRoom: "kitchen"
          }));
          setGameLog((prevLog) => [
            ...prevLog,
            `> ${command}`,
            getBasicRoomDescription("kitchen")
          ]);
        } else {
          handleEnter(target);
        }
        break;
      case "out":
        handleOut();
        break;
      case "move":
        handleMove(target);
        break;
      case "put":
        const [putItem, preposition, container] = target.split(" ");
        handlePut(putItem, container);
        break;
      case "turn":
        if (target.includes(" with ")) {
          const [item, _, tool] = target.split(" with ");
          handleTurn(item, tool);
        } else if (target.startsWith("on ")) {
          handleTurnOn(target.substring(3));
        } else if (target.startsWith("off ")) {
          handleTurnOff(target.substring(4));
        }
        break;
      case "light":
        if (target.includes(" with ")) {
          const [item, _, source] = target.split(" with ");
          handleLight(item, source);
        }
        break;
      case "ring":
        handleRing(target);
        break;
      case "attack":
      case "kill":
        const [creature, withWord, weapon] = target.split(" ");
        handleAttack(creature, weapon);
        break;
      case "throw":
        const [throwItem, atWord, location] = target.split(" ");
        handleThrow(throwItem, location);
        break;
      case "save":
        handleSave();
        break;
      case "restore":
      case "load":
        handleLoad();
        break;
      case "restart":
        handleRestart();
        break;
      case "quit":
      case "q":
        handleQuit();
        break;
      case "score":
        handleScore();
        break;
      case "diagnose":
        handleDiagnose();
        break;
      case "verbose":
        handleVerbose();
        break;
      case "brief":
        handleBrief();
        break;
      case "superbrief":
        handleSuperbrief();
        break;
      case "pray":
        handlePray();
        break;
      case "eat":
        handleEat(target);
        break;
      case "drink":
        handleDrink(target);
        break;
      case "smell":
        handleSmell(target);
        break;
      case "listen":
        handleListen(target);
        break;
      case "jump":
        setGameLog((prevLog) => [...prevLog, "> jump", "Are you proud of yourself?"]);
        break;
      case "hello":
      case "hi":
        setGameLog((prevLog) => [...prevLog, `> ${action}`, "Hello."]);
        break;
      case "zork":
        setGameLog((prevLog) => [...prevLog, "> zork", "At your service!"]);
        break;
      case "g":
        handleRepeatLastCommand();
        break;
      case "climb":
        const currentRoom = gameData.rooms[gameState.currentRoom];
        if (currentRoom.actions["climb tree"]) {
          handleGo("up");
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            "> climb",
            "There's nothing here to climb."
          ]);
        }
        break;
      case "tie":
        const tieWords = target.split(" to ");
        handleTie(tieWords[0], tieWords[1]);
        break;
      case "wave":
        handleWave(target);
        break;
      case "push":
      case "press":
        handlePush(target);
        break;
      case "rub":
        handleRub(target);
        break;
      case "put":
        if (target.startsWith("out ")) {
          handlePutOut(target.substring(4));
        } else if (target.includes(" in ")) {
          const [putItem, preposition, container] = target.split(" in ");
          if (putItem === "torch" && container === "basket" && gameState.currentRoom === "shaft room") {
            if (gameState.inventory.includes("torch")) {
              setGameState(prevState => ({
                ...prevState,
                inventory: prevState.inventory.filter(i => i !== "torch"),
                itemsInWorld: { ...prevState.itemsInWorld, torch: "basket" },
                roomStates: {
                  ...prevState.roomStates,
                  "shaft room": { torchInBasket: true }
                }
              }));
              setGameLog((prevLog) => [
                ...prevLog,
                `> put torch in basket`,
                "You place the torch in the basket."
              ]);
            } else {
              setGameLog((prevLog) => [
                ...prevLog,
                `> put torch in basket`,
                "You don't have the torch."
              ]);
            }
          } else {
            handlePut(putItem, container);
          }
        }
        break;
      case "squeeze":
        handleSqueeze(target);
        break;
      case "slide":
        handleSlide();
        break;
      case "inflate":
        handleInflate(target);
        break;
      case "board":
        handleBoard(target);
        break;
      case "launch":
        handleLaunch();
        break;
      case "wait":
        handleWait();
        break;
      case "dig":
        handleDig();
        break;
      case "cross":
        handleCross(target);
        break;
      case "touch":
        handleTouch(target);
        break;
      case "wind":
        handleWind(target);
        break;
      case "give":
        const [giveItem, toWord, giveTarget] = target.split(" to ");
        handleGive(giveItem, giveTarget);
        break;
      case "kill":
        const [killTarget, killWithWord, killWeapon] = target.split(" with ");
        handleKill(killTarget, killWeapon);
        break;
      case "ulysses":
      case "odysseus":
        if (gameState.currentRoom === "cyclops room") {
          setGameState(prevState => ({
            ...prevState,
            roomStates: {
              ...prevState.roomStates,
              "cyclops room": { 
                ...prevState.roomStates?.["cyclops room"],
                cyclopsFled: true 
              }
            }
          }));
          setGameLog((prevLog) => [
            ...prevLog,
            `> ${action}`,
            "At the sound of his ancient enemy's name, the cyclops flees in terror, smashing through the wall to the living room!"
          ]);
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            `> ${action}`,
            "Nothing happens."
          ]);
        }
        break;
      case "echo":
        if (gameState.currentRoom === "loud room") {
          setGameLog((prevLog) => [
            ...prevLog,
            "> echo",
            "The acoustics of the room cause your voice to echo and reverberate. As the sound dies away, you notice a platinum bar has appeared!"
          ]);
          setGameState(prevState => ({
            ...prevState,
            itemsInWorld: {
              ...prevState.itemsInWorld,
              "platinum bar": "loud room"
            }
          }));
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            "> echo",
            "Your voice echoes slightly."
          ]);
        }
        break;
      case "help":
      case "?":
        handleHelp();
        break;
      default:
        // Check for profanity
        if (/^(damn|shit|fuck|crap|hell)$/i.test(action)) {
          setGameLog((prevLog) => [
            ...prevLog,
            `> ${command}`,
            "Such language in a high-class establishment like this!"
          ]);
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            `> ${command}`,
            "I don't understand that command."
          ]);
        }
        break;
    }
  };

  const handleGo = (direction) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    const nextRoom = currentRoom.actions[`go ${direction}`];

    // Special handling for dome room descent
    if (gameState.currentRoom === "dome room" && direction === "down") {
      if (!gameState.roomStates?.["dome room"]?.ropeAttached) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> go ${direction}`,
          "You can't go down without using the rope - that would be certain death!"
        ]);
        return;
      }
    }

    // Special handling for trapdoor descent
    if (gameState.currentRoom === "living room" && direction === "down") {
      if (!gameState.trapdoorOpen) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> go ${direction}`,
          "The trapdoor is closed."
        ]);
        return;
      }
    }

    // Check if troll is blocking the way
    if (gameState.currentRoom === "troll room" && 
        !gameState.roomStates?.["troll room"]?.trollDefeated) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> go ${direction}`,
        "The troll blocks your way!"
      ]);
      return;
    }

    if (nextRoom && gameData.rooms[nextRoom]) {
      setGameState((prevState) => ({
        ...prevState,
        currentRoom: nextRoom
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> go ${direction}`,
        getBasicRoomDescription(nextRoom)
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> go ${direction}`,
        "You can't go that way."
      ]);
    }
  };

  const handleTake = (item) => {
    // Check for deadly skeleton interaction
    if (item === "skeleton" && gameState.currentRoom === "adventurers remains") {
      handleDeath("skeleton");
      return;
    }

    // Check if the item exists in the current room
    const itemLocation = gameState.itemsInWorld[item];
    if (itemLocation === gameState.currentRoom) {
      setGameState((prevState) => ({
        ...prevState,
        inventory: [...prevState.inventory, item],
        itemsInWorld: { ...prevState.itemsInWorld, [item]: null }
      }));

      // Award points if it's a treasure
      if (gameData.state.trophyItems.includes(item)) {
        const points = gameData.state.treasurePoints[item].take;
        setGameSettings(prev => ({
          ...prev,
          score: prev.score + points
        }));
      }

      setGameLog((prevLog) => [
        ...prevLog,
        `> take ${item}`,
        `Taken.`
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> take ${item}`,
        `You can't see any ${item} here.`
      ]);
    }
  };

  const handleUse = (item) => {
    if (gameState.inventory.includes(item)) {
      const currentRoom = gameData.rooms[gameState.currentRoom];
      const useAction = currentRoom.actions[`use ${item}`];

      if (useAction) {
        setGameLog((prevLog) => [...prevLog, `> use ${item}`, useAction]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> use ${item}`,
          `You can't use the ${item} here.`
        ]);
      }
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> use ${item}`,
        `You don't have a ${item}.`
      ]);
    }
  };

  const handleInventory = () => {
    if (gameState.inventory.length > 0) {
      setGameLog((prevLog) => [
        ...prevLog,
        "> inventory",
        `You are carrying: ${gameState.inventory.join(", ")}`
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        "> inventory",
        "Your inventory is empty."
      ]);
    }
  };

  const handleLook = () => {
    setGameLog((prevLog) => [
      ...prevLog,
      "> look",
      getRoomDescriptionWithItems(gameState.currentRoom)
    ]);
  };

  const handleUnlock = (target) => {
    if (gameState.lockedDoors.includes(target)) {
      setGameState((prevState) => ({
        ...prevState,
        lockedDoors: prevState.lockedDoors.filter((door) => door !== target)
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> unlock ${target}`,
        `${target} is now unlocked.`
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> unlock ${target}`,
        `${target} is not locked.`
      ]);
    }
  };

  const handleDrop = (item) => {
    if (gameState.inventory.includes(item)) {
      setGameState((prevState) => ({
        ...prevState,
        inventory: prevState.inventory.filter((invItem) => invItem !== item),
        itemsInWorld: { ...prevState.itemsInWorld, [item]: gameState.currentRoom }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> drop ${item}`,
        `You have dropped the ${item}.`
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> drop ${item}`,
        `You don't have a ${item}.`
      ]);
    }
  };

  const handleExamine = (item) => {
    if (gameState.inventory.includes(item) || gameState.itemsInWorld[item] === gameState.currentRoom) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> examine ${item}`,
        `The ${item} looks interesting, but there's nothing unusual.`
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> examine ${item}`,
        `You can't see a ${item} here.`
      ]);
    }
  };

  const handleRead = (object) => {
    if (gameState.inventory.includes(object) || gameState.itemsInWorld[object] === gameState.currentRoom) {
      const description = gameData.state.itemDescriptions[object];
      if (description) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> read ${object}`,
          description
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> read ${object}`,
          `There's nothing written on the ${object}.`
        ]);
      }
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> read ${object}`,
        `You don't have the ${object}.`
      ]);
    }
  };

  const handleEnter = (target) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    const enterAction = currentRoom.actions["enter"];
    
    if (enterAction && gameData.rooms[enterAction]) {
      setGameState((prevState) => ({
        ...prevState,
        currentRoom: enterAction
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> enter ${target}`,
        getBasicRoomDescription(enterAction)
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> enter ${target}`,
        `You can't enter that.`
      ]);
    }
  };

  const handleSave = () => {
    try {
      localStorage.setItem('zorkSaveGame', JSON.stringify(gameState));
      setGameLog((prevLog) => [
        ...prevLog,
        "> save",
        "Game saved."
      ]);
    } catch (error) {
      setGameLog((prevLog) => [
        ...prevLog,
        "> save",
        "Failed to save game."
      ]);
    }
  };

  const handleLoad = () => {
    try {
      const savedGame = localStorage.getItem('zorkSaveGame');
      if (savedGame) {
        const loadedState = JSON.parse(savedGame);
        setGameState(loadedState);
        setGameLog((prevLog) => [
          ...prevLog,
          "> load",
          "Game loaded.",
          "",
          gameData.rooms[loadedState.currentRoom].description
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          "> load",
          "No saved game found."
        ]);
      }
    } catch (error) {
      setGameLog((prevLog) => [
        ...prevLog,
        "> load",
        "Failed to load game."
      ]);
    }
  };

  const handleRestart = () => {
    const initialRoom = gameData.state.currentRoom;
    setGameState({
      currentRoom: initialRoom,
      inventory: [],
      itemsInWorld: gameData.state.itemsInWorld,
      lockedDoors: gameData.state.lockedDoors,
      rugMoved: false
    });
    setGameLog((prevLog) => [
      ...prevLog,
      "> restart",
      "Game restarted.",
      "",
      "ZORK I: The Great Underground Empire",
      "Copyright (c) 1981, 1982, 1983 Infocom, Inc.",
      "All rights reserved.",
      "",
      getBasicRoomDescription(initialRoom)
    ]);
  };

  const handleHelp = () => {
    setGameLog((prevLog) => [
      ...prevLog,
      "> help",
      "Available commands:",
      "- look (l): Look around the current room",
      "- go [direction]: Move in a direction (north, south, east, west, up, down)",
      "- north (n), south (s), east (e), west (w), up (u), down (d): Move in that direction",
      "- take/get [item]: Pick up an item",
      "- drop [item]: Drop an item from your inventory",
      "- move [item]: Move an item to reveal what's underneath",
      "- inventory (i): Check your inventory",
      "- examine (x) [item]: Look at an item closely",
      "- open [object]: Open something",
      "- enter [object]: Enter something",
      "- save: Save your current game",
      "- load/restore: Load your saved game",
      "- restart: Start a new game",
      "- help: Show this help message"
    ]);
  };

  const handleMove = (item) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    const moveAction = currentRoom.actions[`move ${item}`];
    
    if (moveAction) {
      // If it's the rug, update the room description to show the trapdoor
      if (item === "rug" && gameState.currentRoom === "living room") {
        setGameState(prevState => ({
          ...prevState,
          rugMoved: true
        }));
      }
      setGameLog((prevLog) => [
        ...prevLog,
        `> move ${item}`,
        moveAction
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> move ${item}`,
        `You can't move that.`
      ]);
    }
  };

  // Add new handler functions
  const handleTakeAll = () => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    const roomItems = Object.entries(gameState.itemsInWorld)
      .filter(([item, location]) => location === gameState.currentRoom)
      .map(([item]) => item);

    if (roomItems.length === 0) {
      setGameLog((prevLog) => [
        ...prevLog,
        "> take all",
        "There is nothing here to take."
      ]);
      return;
    }

    const takenItems = [];
    roomItems.forEach(item => {
      setGameState((prevState) => ({
        ...prevState,
        inventory: [...prevState.inventory, item],
        itemsInWorld: { ...prevState.itemsInWorld, [item]: null }
      }));
      takenItems.push(item);
    });

    setGameLog((prevLog) => [
      ...prevLog,
      "> take all",
      `Taken: ${takenItems.join(", ")}`
    ]);
  };

  const handlePut = (item, container) => {
    if (!gameState.inventory.includes(item)) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> put ${item} in ${container}`,
        `You don't have the ${item}.`
      ]);
      return;
    }

    if (container === "case" && gameState.currentRoom === "living room") {
      // Check if it's a trophy item
      if (gameData.state.trophyItems.includes(item)) {
        setGameState(prevState => ({
          ...prevState,
          inventory: prevState.inventory.filter(i => i !== item),
          itemsInWorld: { ...prevState.itemsInWorld, [item]: "case" }
        }));

        // Add points for putting the treasure in the case
        const points = gameData.state.treasurePoints[item].case;
        setGameSettings(prev => ({
          ...prev,
          score: prev.score + points
        }));

        let message = `You put the ${item} in the trophy case.`;
        
        // Check if this was the last trophy
        const itemsInCase = Object.entries(gameState.itemsInWorld)
          .filter(([item, location]) => location === "case")
          .map(([item]) => item);
          
        if (itemsInCase.length === gameData.state.trophyItems.length - 1) {
          message += "\n\nCongratulations! You have collected all the treasures and won the game!\n" +
                    "Your score is 350 points out of 350 (175 for finding treasures, 175 for putting them in the case).\n" +
                    "This gives you the rank of Master Adventurer.\n\n" +
                    "Would you like to continue exploring the Great Underground Empire?";
        }

        setGameLog((prevLog) => [
          ...prevLog,
          `> put ${item} in ${container}`,
          message
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> put ${item} in ${container}`,
          `The ${item} isn't valuable enough to go in the trophy case.`
        ]);
      }
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> put ${item} in ${container}`,
        `You can't put the ${item} in the ${container}.`
      ]);
    }
  };

  const handleOut = () => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    if (currentRoom.actions["exit"]) {
      handleEnter("exit");
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        "> out",
        "You can't go out here."
      ]);
    }
  };

  const handleClose = (target) => {
    if (target === "lid" && gameState.currentRoom === "machine room") {
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "machine room": {
            ...prevState.roomStates?.["machine room"],
            lidOpen: false
          }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> close ${target}`,
        "You close the machine's lid."
      ]);
      return;
    }
    setGameLog((prevLog) => [
      ...prevLog,
      `> close ${target}`,
      `You can't close that.`
    ]);
  };

  const handleScore = () => {
    setGameLog((prevLog) => [
      ...prevLog,
      "> score",
      `Your score is ${gameSettings.score} points in ${gameState.inventory.length} moves.`,
      "This gives you the rank of Beginner."
    ]);
  };

  const handleDiagnose = () => {
    setGameLog((prevLog) => [
      ...prevLog,
      "> diagnose",
      "You are in perfect health.",
      "You are wide awake.",
      "You are not hungry."
    ]);
  };

  const handleVerbose = () => {
    setGameSettings(prev => ({
      ...prev,
      verbose: true,
      brief: false,
      superbrief: false
    }));
    setGameLog((prevLog) => [
      ...prevLog,
      "> verbose",
      "Maximum verbosity."
    ]);
  };

  const handleBrief = () => {
    setGameSettings(prev => ({
      ...prev,
      verbose: false,
      brief: true,
      superbrief: false
    }));
    setGameLog((prevLog) => [
      ...prevLog,
      "> brief",
      "Brief descriptions."
    ]);
  };

  const handleSuperbrief = () => {
    setGameSettings(prev => ({
      ...prev,
      verbose: false,
      brief: false,
      superbrief: true
    }));
    setGameLog((prevLog) => [
      ...prevLog,
      "> superbrief",
      "Superbrief descriptions."
    ]);
  };

  const handleQuit = () => {
    setGameLog((prevLog) => [
      ...prevLog,
      "> quit",
      "Thanks for playing! Refresh the page to start a new game."
    ]);
  };

  const handleRepeatLastCommand = () => {
    if (gameSettings.lastCommand) {
      processCommand(gameSettings.lastCommand);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        "> g",
        "No command to repeat."
      ]);
    }
  };

  const handleAttack = (creature, weapon) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    
    if (creature === "troll" && gameState.currentRoom === "troll room") {
      if (weapon === "sword" && gameState.inventory.includes("sword")) {
        setGameState(prevState => ({
          ...prevState,
          roomStates: {
            ...prevState.roomStates,
            "troll room": { trollDefeated: true }
          }
        }));
        setGameLog((prevLog) => [
          ...prevLog,
          `> attack troll with sword`,
          "The troll, disarmed by your skilled swordplay, takes flight. The troll, defeated, disappears into the gloom."
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> attack troll with ${weapon}`,
          "The troll laughs at your puny attempt to attack him."
        ]);
      }
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> attack ${creature} with ${weapon}`,
        "There is nothing here to attack."
      ]);
    }
  };

  const handleThrow = (item, target) => {
    if (!gameState.inventory.includes(item)) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> throw ${item} at ${target}`,
        `You don't have the ${item}.`
      ]);
      return;
    }

    if (item === "garlic" && target === "troll" && gameState.currentRoom === "troll room") {
      setGameState(prevState => ({
        ...prevState,
        inventory: prevState.inventory.filter(i => i !== "garlic"),
        roomStates: {
          ...prevState.roomStates,
          "troll room": { trollDefeated: true }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> throw garlic at troll`,
        "The troll catches the garlic and runs away in disgust. The troll, defeated, disappears into the gloom."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> throw ${item} at ${target}`,
        `Throwing the ${item} doesn't accomplish anything.`
      ]);
    }
  };

  const handleTie = (item, target) => {
    if (!gameState.inventory.includes(item)) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> tie ${item} to ${target}`,
        `You don't have the ${item}.`
      ]);
      return;
    }

    const currentRoom = gameData.rooms[gameState.currentRoom];
    if (currentRoom.actions[`tie ${item} to ${target}`]) {
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "dome room": { ropeAttached: true }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> tie ${item} to ${target}`,
        currentRoom.actions[`tie ${item} to ${target}`]
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> tie ${item} to ${target}`,
        `You can't tie the ${item} to that.`
      ]);
    }
  };

  const handleWave = (item) => {
    if (!gameState.inventory.includes(item)) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> wave ${item}`,
        `You don't have the ${item}.`
      ]);
      return;
    }

    const currentRoom = gameData.rooms[gameState.currentRoom];
    const waveAction = currentRoom.actions["wave " + item];
    
    if (waveAction && waveAction.requires && waveAction.requires.includes(item)) {
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "east of chasm": { ...prevState.roomStates?.["east of chasm"], potRevealed: true }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> wave ${item}`,
        waveAction.message
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> wave ${item}`,
        `Waving the ${item} accomplishes nothing.`
      ]);
    }
  };

  const handlePush = (target) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    const pushAction = currentRoom.actions[`push ${target}`];
    
    if (pushAction) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> push ${target}`,
        pushAction
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> push ${target}`,
        `You can't push that.`
      ]);
    }
  };

  const handleTurn = (item, tool) => {
    if (item === "switch" && tool === "screwdriver" && 
        gameState.currentRoom === "machine room") {
      if (!gameState.roomStates?.["machine room"]?.coalInMachine) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> turn switch with screwdriver`,
          "The machine needs coal to operate."
        ]);
        return;
      }
      
      if (gameState.roomStates?.["machine room"]?.lidOpen) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> turn switch with screwdriver`,
          "You should close the lid first."
        ]);
        return;
      }

      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "machine room": {
            ...prevState.roomStates?.["machine room"],
            machineRun: true,
            coalInMachine: false
          }
        },
        itemsInWorld: {
          ...prevState.itemsInWorld,
          diamond: "machine room"
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> turn switch with screwdriver`,
        "The machine rumbles to life, processing the coal. After a moment, it stops."
      ]);
      return;
    }
    const currentRoom = gameData.rooms[gameState.currentRoom];
    const turnAction = currentRoom.actions[`turn ${item} with ${tool}`];
    
    if (turnAction && turnAction.requires && gameState.inventory.includes(turnAction.requires[0])) {
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "dam": { damOpened: true }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> turn ${item} with ${tool}`,
        turnAction.message
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> turn ${item} with ${tool}`,
        `You can't turn that.`
      ]);
    }
  };

  const handleLight = (item, source) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    
    if (item === "candles" && source === "match" && 
        gameState.inventory.includes("candles") && 
        gameState.inventory.includes("matches")) {
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "entrance to hades": { 
            ...prevState.roomStates?.["entrance to hades"],
            candlesLit: true 
          }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> light ${item} with ${source}`,
        "The candles are now lit, casting an eerie glow."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> light ${item} with ${source}`,
        `You can't light that.`
      ]);
    }
  };

  const handleRing = (item) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    
    if (item === "bell" && gameState.currentRoom === "entrance to hades") {
      setGameState(prevState => ({
        ...prevState,
        inventory: prevState.inventory.filter(i => i !== "bell" && i !== "candles"),
        itemsInWorld: {
          ...prevState.itemsInWorld,
          bell: gameState.currentRoom,
          candles: gameState.currentRoom
        },
        roomStates: {
          ...prevState.roomStates,
          "entrance to hades": { 
            ...prevState.roomStates?.["entrance to hades"],
            bellRung: true 
          }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> ring ${item}`,
        "The bell suddenly becomes red hot! You drop it, along with the candles!"
      ]);
    } else {
      const ringAction = currentRoom.actions[`ring ${item}`];
      if (ringAction) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> ring ${item}`,
          ringAction
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> ring ${item}`,
          `You can't ring that.`
        ]);
      }
    }
  };

  const handleRub = (item) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    
    if (item === "mirror" && gameState.currentRoom === "mirror room south") {
      if (!gameState.roomStates?.["mirror room south"]?.candlesOut) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> rub ${item}`,
          "Nothing happens. The candles need to be extinguished first."
        ]);
        return;
      }
      
      setGameState(prevState => ({
        ...prevState,
        currentRoom: "mirror room north",
        roomStates: {
          ...prevState.roomStates,
          "mirror room south": { 
            ...prevState.roomStates?.["mirror room south"],
            mirrorRubbed: true 
          }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> rub ${item}`,
        "As you rub the mirror, your surroundings shimmer and shift. You find yourself in a different mirror room!",
        "",
        getBasicRoomDescription("mirror room north")
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> rub ${item}`,
        `Rubbing the ${item} has no effect.`
      ]);
    }
  };

  const handlePutOut = (item) => {
    if (item === "candles" && gameState.currentRoom === "mirror room south") {
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "mirror room south": { 
            ...prevState.roomStates?.["mirror room south"],
            candlesOut: true 
          }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> put out ${item}`,
        "You extinguish the candles."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> put out ${item}`,
        `You can't put that out.`
      ]);
    }
  };

  const handleSqueeze = (direction) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    
    if (currentRoom.actions[`squeeze ${direction}`]) {
      // Check if player has dropped everything except screwdriver
      const allowedItems = ["screwdriver"];
      const extraItems = gameState.inventory.filter(item => !allowedItems.includes(item));
      
      if (extraItems.length > 0) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> squeeze ${direction}`,
          "You're carrying too much to squeeze through the crack. You need to drop everything except the screwdriver."
        ]);
        return;
      }
      
      const nextRoom = currentRoom.actions[`squeeze ${direction}`];
      setGameState(prevState => ({
        ...prevState,
        currentRoom: nextRoom
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> squeeze ${direction}`,
        getBasicRoomDescription(nextRoom)
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> squeeze ${direction}`,
        "You can't squeeze through there."
      ]);
    }
  };

  const handleTakeFrom = (item, container) => {
    if (container === "basket" && gameState.currentRoom === "drafty room") {
      if (gameState.containerContents.basket.includes(item)) {
        setGameState(prevState => ({
          ...prevState,
          inventory: [...prevState.inventory, item],
          containerContents: {
            ...prevState.containerContents,
            basket: prevState.containerContents.basket.filter(i => i !== item)
          }
        }));
        setGameLog((prevLog) => [
          ...prevLog,
          `> take ${item} from ${container}`,
          `You take the ${item} from the basket.`
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> take ${item} from ${container}`,
          `There is no ${item} in the basket.`
        ]);
      }
      return;
    }
  };

  const handlePutInMachine = (item) => {
    if (!gameState.inventory.includes(item)) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> put ${item} in machine`,
        `You don't have the ${item}.`
      ]);
      return;
    }

    if (!gameState.roomStates?.["machine room"]?.lidOpen) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> put ${item} in machine`,
        "The machine's lid is closed."
      ]);
      return;
    }

    if (item === "coal") {
      setGameState(prevState => ({
        ...prevState,
        inventory: prevState.inventory.filter(i => i !== item),
        roomStates: {
          ...prevState.roomStates,
          "machine room": {
            ...prevState.roomStates?.["machine room"],
            coalInMachine: true
          }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> put ${item} in machine`,
        "You put the coal in the machine."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> put ${item} in machine`,
        "That doesn't belong in the machine."
      ]);
    }
  };

  const handleSlide = () => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    
    if (currentRoom.actions["slide"] || currentRoom.actions["slide down"]) {
      const nextRoom = currentRoom.actions["slide"] || currentRoom.actions["slide down"];
      setGameState(prevState => ({
        ...prevState,
        currentRoom: nextRoom
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        "> slide",
        "Wheeeeeee! You slide down the chute...",
        "",
        getBasicRoomDescription(nextRoom)
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        "> slide",
        "There's nothing to slide down here."
      ]);
    }
  };

  const handleTurnOn = (item) => {
    if (item === "lamp" && gameState.inventory.includes("lamp")) {
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          lamp: { isOn: true }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> turn on ${item}`,
        "The lamp is now on."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> turn on ${item}`,
        `You can't turn that on.`
      ]);
    }
  };

  const handleTurnOff = (item) => {
    if (item === "lamp" && gameState.inventory.includes("lamp")) {
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          lamp: { isOn: false }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> turn off ${item}`,
        "The lamp is now off."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> turn off ${item}`,
        `You can't turn that off.`
      ]);
    }
  };

  const handleInflate = (item) => {
    if (item === "plastic" || item === "boat") {
      if (!gameState.inventory.includes("air pump")) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> inflate ${item}`,
          "You need something to inflate it with."
        ]);
        return;
      }

      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "dam base": { boatInflated: true }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> inflate ${item}`,
        "The plastic pile inflates into a sturdy rubber boat!"
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> inflate ${item}`,
        "You can't inflate that."
      ]);
    }
  };

  const handleBoard = (item) => {
    if (item === "boat" && gameState.currentRoom === "dam base") {
      if (!gameState.roomStates?.["dam base"]?.boatInflated) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> board ${item}`,
          "The boat needs to be inflated first."
        ]);
        return;
      }

      setGameState(prevState => ({
        ...prevState,
        currentRoom: "in boat"
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> board ${item}`,
        "You board the rubber boat.",
        "",
        getBasicRoomDescription("in boat")
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> board ${item}`,
        "You can't board that."
      ]);
    }
  };

  const handleLaunch = () => {
    if (gameState.currentRoom === "in boat") {
      setGameLog((prevLog) => [
        ...prevLog,
        "> launch",
        "The boat begins to move with the current."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        "> launch",
        "You're not in anything that can be launched."
      ]);
    }
  };

  const handleWait = () => {
    if (gameState.currentRoom === "in boat") {
      const waitCount = (gameState.roomStates?.["in boat"]?.waitCount || 0) + 1;
      
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "in boat": { 
            waitCount,
            buoyVisible: waitCount >= 3
          }
        }
      }));

      let message = "The boat drifts in the current...";
      if (waitCount === 3) {
        message += "\nYou notice a buoy floating in the water nearby.";
      }

      setGameLog((prevLog) => [
        ...prevLog,
        "> wait",
        message
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        "> wait",
        "Time passes..."
      ]);
    }
  };

  const handleDig = () => {
    if (gameState.currentRoom === "sandy cave") {
      if (!gameState.inventory.includes("shovel")) {
        setGameLog((prevLog) => [
          ...prevLog,
          "> dig",
          "You need a shovel to dig here."
        ]);
        return;
      }

      const digCount = (gameState.roomStates?.["sandy cave"]?.digCount || 0) + 1;
      
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "sandy cave": { 
            digCount,
            scarabRevealed: digCount >= 3
          }
        },
        itemsInWorld: digCount >= 3 ? {
          ...prevState.itemsInWorld,
          scarab: "sandy cave"
        } : prevState.itemsInWorld
      }));

      let message = "You dig in the sand...";
      if (digCount === 3) {
        message += "\nYou uncover an ancient scarab!";
      } else if (digCount > 3) {
        message += "\nYou find nothing else of interest.";
      }

      setGameLog((prevLog) => [
        ...prevLog,
        "> dig",
        message
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        "> dig",
        "The ground is too hard to dig here."
      ]);
    }
  };

  const handleCross = (target) => {
    if (target === "rainbow" && gameState.currentRoom === "aragain falls") {
      setGameState(prevState => ({
        ...prevState,
        currentRoom: "canyon view"
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> cross ${target}`,
        "You cross the rainbow bridge...",
        "",
        getBasicRoomDescription("canyon view")
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> cross ${target}`,
        "You can't cross that."
      ]);
    }
  };

  const handleTouch = (target) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    const touchAction = currentRoom.actions[`touch ${target}`];
    
    if (touchAction) {
      if (target === "skeleton" && gameState.currentRoom === "adventurers remains") {
        handleDeath("skeleton");
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> touch ${target}`,
          touchAction
        ]);
      }
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> touch ${target}`,
        `You can't touch that.`
      ]);
    }
  };

  const handleDeath = (cause) => {
    const deathMessage = gameData.state.deathMessages[cause];
    setGameState((prevState) => ({
      ...prevState,
      isDead: true
    }));
    setGameLog((prevLog) => [
      ...prevLog,
      `> touch skeleton`,
      deathMessage
    ]);
  };

  const handleWind = (item) => {
    if (item === "canary" && gameState.currentRoom === "tree top") {
      if (!gameState.inventory.includes("jeweled egg")) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> wind canary`,
          "You don't have the jeweled egg."
        ]);
        return;
      }

      setGameState(prevState => ({
        ...prevState,
        inventory: [
          ...prevState.inventory.filter(i => i !== "jeweled egg"),
          "canary",
          "egg"
        ],
        roomStates: {
          ...prevState.roomStates,
          "tree top": { canaryWound: true }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> wind canary`,
        "You wind up the mechanical canary and carefully remove it from the jeweled egg. Now you have both a beautiful mechanical canary and an exquisite jeweled egg!"
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> wind ${item}`,
        "You can't wind that up."
      ]);
    }
  };

  const handleGive = (item, target) => {
    if (!gameState.inventory.includes(item)) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> give ${item} to ${target}`,
        `You don't have the ${item}.`
      ]);
      return;
    }

    if (target === "thief" && item === "jeweled egg" && gameState.currentRoom === "treasure room") {
      setGameState(prevState => ({
        ...prevState,
        inventory: prevState.inventory.filter(i => i !== "jeweled egg"),
        thiefInventory: [...(prevState.thiefInventory || []), "jeweled egg"],
        roomStates: {
          ...prevState.roomStates,
          "treasure room": { 
            ...prevState.roomStates?.["treasure room"],
            thiefHasEgg: true 
          }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> give ${item} to ${target}`,
        "The thief examines the egg carefully and pockets it with a grin."
      ]);
    } else if (target === "cyclops" && (item === "lunch" || item === "water") && 
               gameState.currentRoom === "cyclops room") {
      if (gameState.inventory.includes("lunch") && gameState.inventory.includes("water")) {
        setGameState(prevState => ({
          ...prevState,
          inventory: prevState.inventory.filter(i => i !== "lunch" && i !== "water"),
          roomStates: {
            ...prevState.roomStates,
            "cyclops room": { 
              ...prevState.roomStates?.["cyclops room"],
              cyclopsSleeping: true 
            }
          }
        }));
        setGameLog((prevLog) => [
          ...prevLog,
          `> give food to cyclops`,
          "The cyclops accepts the food and water, then falls into a deep sleep."
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> give food to cyclops`,
          "You need both food and water to satisfy the cyclops."
        ]);
      }
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> give ${item} to ${target}`,
        "That wouldn't be useful."
      ]);
    }
  };

  const handleKill = (target, weapon) => {
    if (target === "thief" && weapon === "knife" && gameState.currentRoom === "treasure room") {
      if (!gameState.inventory.includes("knife")) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> kill thief with knife`,
          "You don't have the knife."
        ]);
        return;
      }

      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "treasure room": { 
            ...prevState.roomStates?.["treasure room"],
            thiefAlive: false 
          }
        },
        itemsInWorld: {
          ...prevState.itemsInWorld,
          ...(prevState.thiefInventory || []).reduce((acc, item) => ({
            ...acc,
            [item]: "treasure room"
          }), {})
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> kill thief with knife`,
        "You catch the thief off guard! After a brief struggle, he falls to the ground, dropping his loot."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> kill ${target} with ${weapon}`,
        "Violence isn't the answer to this one."
      ]);
    }
  };

  return (
    <div className="game-interface">
      <div className="game-log" ref={logRef}>
        {gameLog.map((log, index) => (
          <p key={index}>{log}</p>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={handleInput}
          placeholder="What do you want to do?"
          autoFocus
        />
      </form>
    </div>
  );
}

export default GameInterface;
