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

    const [action, ...rest] = command.split(" ");
    const target = rest.join(" ");

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
    switch (action.toLowerCase()) {
      case "go":
        handleGo(target);
        break;
      case "take":
      case "get":
      case "grab":
      case "pick":
        if (target === "all") {
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
        handleOpen(target);
        break;
      case "close":
        handleClose(target);
        break;
      case "enter":
      case "in":
        handleEnter(target);
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
        if (target.startsWith("on ")) {
          handleTurnOn(target.substring(3));
        } else if (target.startsWith("off ")) {
          handleTurnOff(target.substring(4));
        }
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
    const currentRoom = gameData.rooms[gameState.currentRoom];
    const roomItems = gameState.itemsInWorld;

    if (roomItems[item] === gameState.currentRoom) {
      setGameState((prevState) => ({
        ...prevState,
        inventory: [...prevState.inventory, item],
        itemsInWorld: { ...prevState.itemsInWorld, [item]: null }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> take ${item}`,
        `You have picked up the ${item}.`
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> take ${item}`,
        `There is no ${item} here.`
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

  const handleOpen = (target) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    
    // First check if it's a container
    if (gameData.state.containerContents[target]) {
      if (gameState.inventory.includes(target) || gameState.itemsInWorld[target] === gameState.currentRoom) {
        const description = gameData.state.itemDescriptions[target];
        setGameLog((prevLog) => [
          ...prevLog,
          `> open ${target}`,
          description
        ]);
        return;
      }
    }
    
    // Then check room actions
    const openAction = currentRoom.actions["open"];
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
      setGameLog((prevLog) => [
        ...prevLog,
        `> move ${item}`,
        moveAction
      ]);
      // If it's the rug, update the room description to show the trapdoor
      if (item === "rug" && gameState.currentRoom === "living room") {
        setGameState(prevState => ({
          ...prevState,
          rugMoved: true
        }));
      }
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
    setGameLog((prevLog) => [
      ...prevLog,
      `> put ${item} in ${container}`,
      `You can't put the ${item} in the ${container}.`
    ]);
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
