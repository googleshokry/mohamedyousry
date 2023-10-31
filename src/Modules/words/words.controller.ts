import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { createWriteStream } from "fs";
import fetch from "node-fetch";
import * as GIFEncoder from "gifencoder";
import { createCanvas, loadImage } from "canvas";
import axios from "axios";
import * as fs from "fs";
import * as tar from "tar";

@Controller()
export class WordsController {
  @Post("gif")
  async generateGif(@Body() q: any) {
    ////
    const { url } = q;
    const current_url = new URL(url);
    const search_params = current_url.searchParams;
    const sid = search_params.get("sid");
    const phi_namespace = search_params.get("phi_namespace");
    const viewer = search_params.get("viewer");

    const { data } = await axios.get(url);
    await (data.series).forEach(async (entry, index) => {
      if(index==1) {
        const folder = "series" + index;
        const urls = [];
        await (entry.images).forEach(async (image, index) => {
          if (image.frame_count > 1) {
            const url = `https://storelpa02.dicomgrid.com/api/v3/storage/study/${data.namespace}/${data.study_uid}/image/${image.id}/version/${image.version}/frame/all/diagnostic?sid=${sid}&phi_namespace=${phi_namespace}&depth=8&viewer=${viewer}`;
            const destinationPath = `./${folder}.tar`;

            const writer = fs.createWriteStream(destinationPath);

            const response = await axios({
              url,
              method: "GET",
              responseType: "stream"
            });

            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
              writer.on("finish", resolve);
              writer.on("error", reject);
            }).then(async () => {
              console.log("Tar archive downloaded successfully.");
              await fs.mkdir(folder, { recursive: true }, async (error) => {
                if (error) {
                  console.log(error);
                } else {
                  console.log("success");
                  await tar.extract({
                    file: destinationPath,
                    cwd: folder
                  }).then(async () => {
                    await tar.list({
                      file: destinationPath,
                      onentry: async (entry) => {
                        await urls.push("./" + folder + "/" + entry.path);
                      }
                    }).then(async () => {
                      // console.log(urls);

                      // sizes
                      const img = await loadImage(urls[0]);


                      //
                      const gifStream = createWriteStream(folder + ".gif");
                      const encoder = new GIFEncoder(img.naturalWidth ?? 512, img.naturalHeight ?? 512);
                      const canvas = createCanvas(img.naturalWidth ?? 512, img.naturalHeight ?? 512);
                      const ctx = canvas.getContext("2d");

                      encoder.createReadStream().pipe(gifStream);
                      encoder.start();
                      encoder.setRepeat(50);
                      encoder.setDelay(200);

                      for (const url of urls) {
                        const img = await loadImage(url);
                        ctx.drawImage(img, 0, 0, img.naturalWidth ?? 512, img.naturalHeight ?? 512);
                        encoder.addFrame(ctx);
                      }
                      encoder.finish();
                      fs.unlink(destinationPath, (error) => {
                      });
                      fs.rmdir(folder, { recursive: true }, (error) => {
                      });
                    }).catch((error) => {
                      console.log(error);
                    });
                  }).catch((error) => {
                    console.log(error);
                  });
                }
              });

            }).catch((error) => {
              console.error("Error downloading tar archive:", error);
            });

          } else {
            const urlImage = `https://storelpa02.dicomgrid.com/api/v3/storage/study/${data.namespace}/${data.study_uid}/image/${image.id}/version/${image.version}/frame/0/diagnostic?sid=${sid}&phi_namespace=${phi_namespace}&depth=8&viewer=${viewer}`;
            await urls.push(urlImage);
            //
            const img = await loadImage(urls[0]);

            const gifStream = createWriteStream(folder + ".gif");
            const encoder = new GIFEncoder(img.naturalWidth ?? 512, img.naturalHeight ?? 512);
            const canvas = createCanvas(img.naturalWidth ?? 512, img.naturalHeight ?? 512);
            const ctx = canvas.getContext("2d");

            encoder.createReadStream().pipe(gifStream);
            encoder.start();
            encoder.setRepeat(50);
            encoder.setDelay(200);

            for (const url of urls) {
              const response = await fetch(url);
              const imageBuffer = await response.buffer();
              const img = await loadImage(imageBuffer);

              ctx.drawImage(img, 0, 0, img.naturalWidth ?? 512, img.naturalHeight ?? 512);
              encoder.addFrame(ctx);
            }
            encoder.finish();
          }
        });
        /////////
      }

    });
    return { message: "GIF generated successfully" };

  }
}