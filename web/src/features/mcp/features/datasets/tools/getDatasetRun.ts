import { GetDatasetRunV1Response } from "@/src/features/public-api/types/datasets";
import {
  getDatasetNameByIdForApi,
  getDatasetRunForApi,
} from "@/src/features/datasets/server/publicDatasetService";
import { defineTool } from "../../../core/define-tool";
import { runMcpTool } from "../../../core/run-mcp-tool";
import { GetDatasetRunMcpInput } from "../schema";

export const [getDatasetRunTool, handleGetDatasetRun] = defineTool({
  name: "getDatasetRun",
  description:
    "Get a dataset run, one experiment or evaluation execution over a dataset, and its run items by dataset ID and run name.",
  baseSchema: GetDatasetRunMcpInput,
  inputSchema: GetDatasetRunMcpInput,
  handler: async (input, context) =>
    runMcpTool({
      spanName: "mcp.dataset_runs.get",
      context,
      attributes: {
        "mcp.dataset_id": input.datasetId,
        "mcp.dataset_run_name": input.runName,
      },
      fn: async () => {
        const datasetName = await getDatasetNameByIdForApi({
          projectId: context.projectId,
          datasetId: input.datasetId,
        });
        const result = await getDatasetRunForApi({
          projectId: context.projectId,
          name: datasetName,
          runName: input.runName,
        });

        return GetDatasetRunV1Response.parse(result);
      },
    }),
  readOnlyHint: true,
});
