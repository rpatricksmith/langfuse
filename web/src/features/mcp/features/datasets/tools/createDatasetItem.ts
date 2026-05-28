import {
  createDatasetItemForApi,
  getDatasetNameByIdForApi,
} from "@/src/features/datasets/server/publicDatasetService";
import { PostDatasetItemsV1Response } from "@/src/features/public-api/types/datasets";
import { defineTool } from "../../../core/define-tool";
import { runMcpTool } from "../../../core/run-mcp-tool";
import { PostDatasetItemMcpInput } from "../schema";

export const [createDatasetItemTool, handleCreateDatasetItem] = defineTool({
  name: "createDatasetItem",
  description:
    "Create or upsert a dataset item by dataset ID, one example in a dataset with input and optional expected output.",
  baseSchema: PostDatasetItemMcpInput,
  inputSchema: PostDatasetItemMcpInput,
  handler: async (input, context) =>
    runMcpTool({
      spanName: "mcp.dataset_items.create",
      context,
      attributes: { "mcp.dataset_id": input.datasetId },
      fn: async () => {
        const { datasetId, ...apiInput } = input;
        const datasetName = await getDatasetNameByIdForApi({
          projectId: context.projectId,
          datasetId,
        });
        const result = await createDatasetItemForApi({
          input: { ...apiInput, datasetName },
          auditScope: context,
        });

        return PostDatasetItemsV1Response.parse(result);
      },
    }),
  destructiveHint: true,
});
