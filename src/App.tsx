/** originally main.js
 * BW 2025/1/20
 *
 * A working example of combining react and three. Checks if WebGL is present.
 *  Implements a loading screen. Features a cube and responsds to user's
 *  clicks and mouse movement.
 */

import { useState, useRef, useEffect } from 'react'
import './style.css'

import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import ThreeCChess from './scene.ts';

function THREECChess() {
  let gameRef = useRef<ThreeCChess>(null);
  let sceneRef = useRef<HTMLElement>(null);
  let statRef = useRef<HTMLElement>(null);
  let pointerRef = useRef<THREE.Vector2>(null);
  let [count, setCount] = useState(0);
  let [completed, setCompleted] = useState(false);
  let config = 2;
  useEffect(() => {
    // manually create a 1.5s wait
    let cur = Date.now();
    let desired = cur + 1500;
    while (cur < desired) {
      cur = Date.now();
    }

    if (!gameRef.current) {
      let game = new ThreeCChess();
      game.setup();
      gameRef.current = game;
    }
    if (sceneRef.current) {
      let currentRef = sceneRef.current as HTMLElement;
      currentRef.appendChild(gameRef.current.getDom());
    }
    setCompleted(true);
    return () => {
      if (sceneRef.current) {
        sceneRef.current.innerHTML = '';
      }
    }
  }, [config]);

  const handleMove = (evt: React.MouseEvent) => {
    let px = (evt.clientX / window.innerWidth) * 2 - 1;
    let py = -(evt.clientY / window.innerHeight) * 2 + 1;
    if (!pointerRef.current) {
      pointerRef.current = new THREE.Vector2(px, py);
    } else {
      let pointer = pointerRef.current as THREE.Vector2;
      pointer.set(px, py)
    }
    gameRef.current.setPointer(px, py);
  }

  let timer = useRef<NodeJS.Timeout>(null);
  const handleClick = (evt: React.MouseEvent) => {
    if (timer.current) {return;}
    gameRef.current.updateColor(0xcc0000);
    timer.current = setTimeout(() => {
      gameRef.current.updateColor(0x00ff00);
      timer.current = null;
    }, 200);
    setCount(count+1);
  }

  return (
    <>
      {!completed && <h1 id="loading">Loading...</h1>}
      <section style={completed ? {} : {display: "none"}}>
        <article ref={sceneRef} onMouseMove={e => handleMove(e)} onClick={e => handleClick(e)}></article>
        <article ref={statRef}></article>
      </section>
    </>
  )
}

function App() {
  return (
    <>
      <h1 style={{position: "absolute", left: "30vw", color: "white"}}>Chinese Chess~</h1>
      {!WebGL.isWebGL2Available() ? createErrorMsg() : <THREECChess />}
    </>
  );
}

/**
 * adds an error message to the site when WebGL implementation is missing.
 */
function createErrorMsg() {
  const warning = WebGL.getWebGL2ErrorMessage();
  return <section id='graphic-error' dangerouslySetInnerHTML={{__html: warning.innerHTML}}></section>;
}

export default App
