<template>
  <canvas ref="container" id="canvas"></canvas>
</template>

<script setup lang="ts">
import { onMounted, ref ,defineProps, defineExpose} from "vue";
import { Application, Ticker } from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display';

const props = defineProps({
  model: {
    type: String,
    default: "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json",
  },
  scale: {
    type: Number,
    default: 0.15,
  },
  x: {
    type: Number,
    default: 0,
  },
  y: {
    type: Number,
    default: 0,
  },
  width: {
    type: Number,
    default: 375,
  },
  height: {
    type: Number,
    default: 667,
  },
  cubism: {
    type: Number,
    default: 4,
  }
})

// register InteractionManager to make Live2D models interactive
Live2DModel.registerTicker(Ticker)

const container = ref<HTMLCanvasElement | null>(null);
let model: Live2DModel;
let curLoopMotion: string = '';
onMounted(async () => {
  if (container.value) {
    // Create PixiJS Application
    const app = new Application({
      view: container.value,
      width: props.width,
      height: props.height,
    });

    // Load Live2D model
    try {
      model = await Live2DModel.from(props.model);
      app.stage.addChild(model);
      model.scale.set(props.scale);
      model.x = props.x;
      model.y = props.y;

      model.on("hit", (hitAreas) => {
        console.log("Hit areas:", hitAreas);
        if (hitAreas.includes("Body")) {
          model.motion("Tap");
        }

        if (hitAreas.includes("Head")) {
          model.expression();
        }
      });
      // 监听motion start事件
      model.internalModel.motionManager.on('motionStart',(motionName: string):void=>{
        // console.log('motionStart:', motionName);
        if(motionName =='idle' && curLoopMotion){  // 判断是否需要循环执行Motion
          startMotion(curLoopMotion);
        }
      })

    } catch (error) {
      console.error("Failed to load Live2D model:", error);
    }
  } else {
    console.error("Container is not available.");
  }
});
// 循环动作
const startLoopMotion = (motionName: string):void=>{
  // console.log('loopMotion',motionName)
  curLoopMotion = motionName;
  startMotion(motionName)
}
// 停止循环动作
const stopLoopMotion = ():void=>{
  curLoopMotion = '';
  stopAllMotions()
}

// 停止所有动作
const stopAllMotions = ():void=>{
  if(model){
    model.internalModel.motionManager.stopAllMotions()
  }
}
const startMotion = (motionName: string)=>{
  console.log('startMotion',motionName)
  model && model.motion(motionName);
}

defineExpose({
  startMotion,
  stopAllMotions,
  startLoopMotion,
  stopLoopMotion,
  
})
</script>
