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
      lockedDoors: gameData.state.lockedDoors
    };
  });
  const logRef = useRef(null);

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
      processCommand(command);
      setInput("");
    }
  };

  const processCommand = (command) => {
    const [action, ...rest] = command.split(" ");
    const target = rest.join(" ");

    // Handle directional shortcuts
    if (["north", "south", "east", "west", "up", "down", "n", "s", "e", "w", "u", "d"].includes(action)) {
      // Convert shortcuts to full directions
      const directionMap = {
        'n': 'north',
        's': 'south',
        'e': 'east',
        'w': 'west',
        'u': 'up',
        'd': 'down'
      };
      const direction = directionMap[action] || action;
      handleGo(direction);
      return;
    }

    switch (action) {
      case "go":
        handleGo(target);
        break;
      case "take":
      case "get":
        handleTake(target);
        break;
      case "use":
        handleUse(target);
        break;
      case "inventory":
      case "i":
        handleInventory();
        break;
      case "look":
      case "l":
        handleLook();
        break;
      case "unlock":
        handleUnlock(target);
        break;
      case "drop":
        handleDrop(target);
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
      case "enter":
        handleEnter(target);
        break;
      case "save":
        handleSave();
        break;
      case "load":
      case "restore":
        handleLoad();
        break;
      case "help":
        handleHelp();
        break;
      case "restart":
        handleRestart();
        break;
      default:
        setGameLog((prevLog) => [
          ...prevLog,
          `> ${command}`,
          "I don't understand that command."
        ]);
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
    setGameLog((prevLog) => [
      ...prevLog,
      `> read ${object}`,
      `You try to read the ${object}, but there's nothing written on it.`
    ]);
  };

  const handleOpen = (target) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
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
      lockedDoors: gameData.state.lockedDoors
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
