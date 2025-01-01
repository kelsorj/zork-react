
import React, { useState, useEffect } from "react";
import gameData from "../data/game_data.json";

function GameInterface() {
  const [gameLog, setGameLog] = useState([]);
  const [input, setInput] = useState("");
  const [gameState, setGameState] = useState({
    currentRoom: gameData.state.currentRoom,
    inventory: [],
    itemsInWorld: gameData.state.itemsInWorld,
    lockedDoors: gameData.state.lockedDoors
  });

  useEffect(() => {
    const initialRoom = gameData.rooms[gameState.currentRoom];
    setGameLog([initialRoom.description]);
  }, [gameState.currentRoom]);

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

    switch (action) {
      case "go":
        handleGo(target);
        break;
      case "take":
        handleTake(target);
        break;
      case "use":
        handleUse(target);
        break;
      case "inventory":
        handleInventory();
        break;
      case "look":
        handleLook();
        break;
      case "unlock":
        handleUnlock(target);
        break;
      case "drop":
        handleDrop(target);
        break;
      case "examine":
        handleExamine(target);
        break;
      case "read":
        handleRead(target);
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
        gameData.rooms[nextRoom].description
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
    const currentRoom = gameData.rooms[gameState.currentRoom];
    setGameLog((prevLog) => [
      ...prevLog,
      "> look",
      currentRoom.description
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

  return (
    <div className="game-interface">
      <div className="game-log">
        {gameLog.map((log, index) => (
          <p key={index}>{log}</p>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={handleInput}
          placeholder="Enter command..."
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default GameInterface;
