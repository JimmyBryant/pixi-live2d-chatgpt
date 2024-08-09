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

async function loadLive2DModel(modelPath, isCubism4) {
  let Live2DModel;
  let module = null;
  if (isCubism4) {
    // 动态导入 Cubism 4 版本
    module = await import('pixi-live2d-display/cubism4');
  } else {
    // 动态导入 Cubism 2.1 版本
    module = await import('pixi-live2d-display/cubism2');
  }
  Live2DModel = module.Live2DModel;
  // 使用 Live2DModel 加载模型
  try {
    const model = await Live2DModel.from(modelPath);
    console.log('Model loaded successfully');
    return model;
  } catch (error) {
    console.error('Failed to load model:', error);
  }
}

// register InteractionManager to make Live2D models interactive
Live2DModel.registerTicker(Ticker)

const container = ref<HTMLCanvasElement | null>(null);
let model = null;
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

    } catch (error) {
      console.error("Failed to load Live2D model:", error);
    }
  } else {
    console.error("Container is not available.");
  }
});

const startMotion = (motionName)=>{
  console.log('startMotion',motionName)
  model.motion(motionName);
}
defineExpose({
  startMotion
})
</script>
