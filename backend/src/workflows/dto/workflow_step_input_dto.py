# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from typing import Optional

from pydantic import Field

from src.common.base_dto import BaseDto


class WorkflowStepInputDto(BaseDto):
    """Defines an input for a workflow step, pointing to the output of a previous step."""

    source_step_id: str = Field(description="The ID of the step that produces this input.")
    media_index: Optional[int] = Field(default=None, description="The index of the media from the source step's output. If None, all media from the source step are used as input for the current step.")

