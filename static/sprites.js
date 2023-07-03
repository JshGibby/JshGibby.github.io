const spritePos = {
    GROUND: [0, 0, 16, 16],
    WALL: [7, 4, 16, 16],
    PLAYERL: [4, 14, 16, 16]
}

const textures = {
    0: 'GROUND',
    1: 'WALL'
}

let t = new Image(320, 1280);
t.src = 'sprites.png';

let SPRITES;

t.onload = async ()=>{
    SPRITES = await createImageBitmap(t);
    // console.log(SPRITES);
}